package com.snortstudios.masterflasher.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;

@CapacitorPlugin(name = "CameraOCR", permissions = {
		@Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
		@Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES }, alias = "read_media_images"),
		@Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE }, alias = "read_external_storage")
})
public class CameraOCRPlugin extends Plugin {

	@PluginMethod
	public void captureOCR(PluginCall call) {
		if (getPermissionState("camera") != PermissionState.GRANTED) {
			requestPermissionForAlias("camera", call, "cameraPermissionsCallback");
		} else {
			startCameraActivity(call);
		}
	}

	@PermissionCallback
	private void cameraPermissionsCallback(PluginCall call) {
		if (getPermissionState("camera") != PermissionState.GRANTED) {
			call.reject("Camera permission is required");
			return;
		}
		startCameraActivity(call);
	}

	private void startCameraActivity(PluginCall call) {
		Intent intent = new Intent(getContext(), CameraOCRActivity.class);
		startActivityForResult(call, intent, "ocrResultCallback");
	}

	@ActivityCallback
	private void ocrResultCallback(PluginCall call, ActivityResult result) {
		if (call == null) {
			return;
		}

		if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
			String text = result.getData().getStringExtra("text");
			if (text != null) {
				JSObject ret = new JSObject();
				ret.put("text", text);
				call.resolve(ret);
			} else {
				call.reject("No text extracted");
			}
		} else if (result.getResultCode() == Activity.RESULT_CANCELED) {
			// Use resolve with cancelled flag or empty text, but plan said { text: string }
			// Let's check plan. Plan says: { text: string; cancelled: boolean; }
			// But my Plan artifact says check CameraOCR.ts which I haven't written.
			// Looking at my Implementation Plan:
			// export interface CameraOCRResult {
			// text: string;
			// cancelled: boolean;
			// }

			JSObject ret = new JSObject();
			ret.put("text", "");
			ret.put("cancelled", true);
			call.resolve(ret);
		} else {
			call.reject("OCR failed or cancelled");
		}
	}
}
