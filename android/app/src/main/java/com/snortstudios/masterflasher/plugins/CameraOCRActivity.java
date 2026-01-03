package com.snortstudios.masterflasher.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageButton;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import com.snortstudios.masterflasher.R;
import com.yalantis.ucrop.UCrop;

import java.io.File;
import java.io.IOException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CameraOCRActivity extends AppCompatActivity {

	private static final String TAG = "CameraOCRActivity";
	private static final int REQUEST_GALLERY_PERMISSION = 200;
	private static final int REQUEST_GALLERY_PICK = 201;

	private PreviewView previewView;
	private ImageButton btnCapture;
	private ImageButton btnGallery;
	private ImageButton btnBack;
	private ProgressBar progressBar;

	private ImageCapture imageCapture;
	private ExecutorService cameraExecutor;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_camera_ocr);

		previewView = findViewById(R.id.viewFinder);
		btnCapture = findViewById(R.id.btnCapture);
		btnGallery = findViewById(R.id.btnGallery);
		btnBack = findViewById(R.id.btnBack);
		progressBar = findViewById(R.id.progressBar);

		// Hide action bar if present
		if (getSupportActionBar() != null) {
			getSupportActionBar().hide();
		}

		if (allPermissionsGranted()) {
			startCamera();
		} else {
			Toast.makeText(this, "Permissions not granted by the plugin.", Toast.LENGTH_SHORT).show();
			finish();
		}

		btnCapture.setOnClickListener(v -> takePhoto());
		btnGallery.setOnClickListener(v -> openGallery());
		btnBack.setOnClickListener(v -> {
			setResult(RESULT_CANCELED);
			finish();
		});

		cameraExecutor = Executors.newSingleThreadExecutor();
	}

	private void startCamera() {
		ListenableFuture<ProcessCameraProvider> cameraProviderFuture = ProcessCameraProvider.getInstance(this);

		cameraProviderFuture.addListener(() -> {
			try {
				ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

				Preview preview = new Preview.Builder().build();
				preview.setSurfaceProvider(previewView.getSurfaceProvider());

				imageCapture = new ImageCapture.Builder()
						.setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
						.build();

				CameraSelector cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA;

				try {
					cameraProvider.unbindAll();
					cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture);
				} catch (Exception exc) {
					Log.e(TAG, "Use case binding failed", exc);
				}

			} catch (ExecutionException | InterruptedException e) {
				Log.e(TAG, "CameraProvider get failed", e);
			}
		}, ContextCompat.getMainExecutor(this));
	}

	private void takePhoto() {
		if (imageCapture == null)
			return;

		showLoading(true);

		File photoFile = new File(getCacheDir(), "ocr_capture_" + System.currentTimeMillis() + ".jpg");

		ImageCapture.OutputFileOptions outputOptions = new ImageCapture.OutputFileOptions.Builder(photoFile).build();

		imageCapture.takePicture(outputOptions, ContextCompat.getMainExecutor(this),
				new ImageCapture.OnImageSavedCallback() {
					@Override
					public void onImageSaved(@NonNull ImageCapture.OutputFileResults outputFileResults) {
						Uri savedUri = androidx.core.content.FileProvider.getUriForFile(
								CameraOCRActivity.this,
								getApplicationContext().getPackageName() + ".fileprovider",
								photoFile);
						startCrop(savedUri);
					}

					@Override
					public void onError(@NonNull ImageCaptureException exception) {
						Log.e(TAG, "Photo capture failed: " + exception.getMessage(), exception);
						showLoading(false);
						Toast.makeText(CameraOCRActivity.this, "Capture failed", Toast.LENGTH_SHORT).show();
					}
				});
	}

	private void openGallery() {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
			if (ContextCompat.checkSelfPermission(this,
					Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
				ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.READ_MEDIA_IMAGES },
						REQUEST_GALLERY_PERMISSION);
			} else {
				launchGalleryIntent();
			}
		} else {
			if (ContextCompat.checkSelfPermission(this,
					Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
				ActivityCompat.requestPermissions(this, new String[] { Manifest.permission.READ_EXTERNAL_STORAGE },
						REQUEST_GALLERY_PERMISSION);
			} else {
				launchGalleryIntent();
			}
		}
	}

	private void launchGalleryIntent() {
		Intent intent = new Intent(Intent.ACTION_PICK);
		intent.setType("image/*");
		startActivityForResult(intent, REQUEST_GALLERY_PICK);
	}

	@Override
	public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
			@NonNull int[] grantResults) {
		super.onRequestPermissionsResult(requestCode, permissions, grantResults);
		if (requestCode == REQUEST_GALLERY_PERMISSION) {
			if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
				launchGalleryIntent();
			} else {
				Toast.makeText(this, "Gallery permission denied", Toast.LENGTH_SHORT).show();
			}
		}
	}

	private void startCrop(Uri sourceUri) {
		File cropFile = new File(getCacheDir(), "ocr_crop_" + System.currentTimeMillis() + ".jpg");
		Uri destinationUri = Uri.fromFile(cropFile);

		UCrop.Options options = new UCrop.Options();
		options.setFreeStyleCropEnabled(true);
		options.setCompressionQuality(90);

		// Match theme colors if possible, or black/white
		// options.setToolbarColor(ContextCompat.getColor(this, android.R.color.black));
		// options.setStatusBarColor(ContextCompat.getColor(this,
		// android.R.color.black));
		// options.setActiveControlsWidgetColor(ContextCompat.getColor(this,
		// com.google.android.material.R.color.design_default_color_primary));

		// Disable StrictMode to allow file:// URI for destination (UCrop requires file
		// URI for destination)
		android.os.StrictMode.VmPolicy.Builder builder = new android.os.StrictMode.VmPolicy.Builder();
		android.os.StrictMode.setVmPolicy(builder.build());

		UCrop.of(sourceUri, destinationUri)
				.withOptions(options)
				.start(this);
	}

	@Override
	protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
		super.onActivityResult(requestCode, resultCode, data);

		if (requestCode == REQUEST_GALLERY_PICK && resultCode == RESULT_OK && data != null) {
			Uri selectedImage = data.getData();
			if (selectedImage != null) {
				startCrop(selectedImage);
			}
		} else if (resultCode == UCrop.RESULT_ERROR) {
			final Throwable cropError = UCrop.getError(data);
			Log.e(TAG, "Crop error: ", cropError);
			showLoading(false);
			Toast.makeText(this, "Crop failed: " + (cropError != null ? cropError.getMessage() : ""),
					Toast.LENGTH_SHORT).show();
		} else if (requestCode == UCrop.REQUEST_CROP) {
			if (resultCode == RESULT_OK && data != null) {
				final Uri resultUri = UCrop.getOutput(data);
				if (resultUri != null) {
					processImageWithOCR(resultUri);
				} else {
					showLoading(false);
					Toast.makeText(this, "Crop result empty", Toast.LENGTH_SHORT).show();
				}
			} else if (resultCode == RESULT_CANCELED) {
				// User cancelled crop, go back to camera preview
				showLoading(false);
			}
		}
	}

	private void processImageWithOCR(Uri imageUri) {
		showLoading(true); // Should already be showing if from camera, but make sure

		try {
			InputImage image = InputImage.fromFilePath(this, imageUri);
			TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

			recognizer.process(image)
					.addOnSuccessListener(visionText -> {
						String text = visionText.getText();
						Intent resultIntent = new Intent();
						resultIntent.putExtra("text", text);
						setResult(RESULT_OK, resultIntent);
						finish();
					})
					.addOnFailureListener(e -> {
						Log.e(TAG, "OCR failed", e);
						showLoading(false);
						Toast.makeText(this, "Text recognition failed", Toast.LENGTH_SHORT).show();
					});

		} catch (IOException e) {
			Log.e(TAG, "Failed to load image for OCR", e);
			showLoading(false);
			Toast.makeText(this, "Failed to load image", Toast.LENGTH_SHORT).show();
		}
	}

	private boolean allPermissionsGranted() {
		return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
	}

	private void showLoading(boolean show) {
		runOnUiThread(() -> {
			progressBar.setVisibility(show ? View.VISIBLE : View.GONE);
			btnCapture.setEnabled(!show);
			btnGallery.setEnabled(!show);
		});
	}

	@Override
	protected void onDestroy() {
		super.onDestroy();
		if (cameraExecutor != null) {
			cameraExecutor.shutdown();
		}
	}
}
