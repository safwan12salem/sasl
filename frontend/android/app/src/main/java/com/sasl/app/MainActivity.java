package com.sasl.app;

import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import app.sasl.plugin.WaveMeshPlugin;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register the WaveMesh native plugin BEFORE super.onCreate
        registerPlugin(WaveMeshPlugin.class);
        
        super.onCreate(savedInstanceState);
                // Enable localStorage in WebView for message persistence
        getBridge().getWebView().getSettings().setDomStorageEnabled(true);
        getBridge().getWebView().getSettings().setDatabaseEnabled(true);

        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
// Enable camera/mic in WebView
getBridge().getWebView().setWebChromeClient(new com.getcapacitor.BridgeWebChromeClient(getBridge()) {
    @Override
    public void onPermissionRequest(android.webkit.PermissionRequest request) {
        request.grant(request.getResources());
    }
});
        // Handle photo downloads from WebView
        getBridge().getWebView().setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    if (url.startsWith("data:")) {
                        // Base64 data URL — decode and save
                        String base64Data = url.substring(url.indexOf(",") + 1);
                        byte[] decodedBytes = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT);
                        java.io.File downloadsDir = android.os.Environment.getExternalStoragePublicDirectory(android.os.Environment.DIRECTORY_DOWNLOADS);
                        if (!downloadsDir.exists()) downloadsDir.mkdirs();
                        String fileName = "sasl-photo-" + System.currentTimeMillis() + ".jpg";
                        java.io.File file = new java.io.File(downloadsDir, fileName);
                        java.io.FileOutputStream fos = new java.io.FileOutputStream(file);
                        fos.write(decodedBytes);
                        fos.close();
                        android.widget.Toast.makeText(MainActivity.this, "📥 Saved to Downloads: " + fileName, android.widget.Toast.LENGTH_LONG).show();
                    } else {
                        // HTTP URL — open in external browser
                        android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        startActivity(intent);
                    }
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Download failed: " + e.getMessage());
                }
            }
        });
        // Request ALL permissions at startup
        String[] permissions;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.NEARBY_WIFI_DEVICES,
                Manifest.permission.CHANGE_WIFI_STATE,
                Manifest.permission.ACCESS_WIFI_STATE,
            };
        } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
                Manifest.permission.CHANGE_WIFI_STATE,
                Manifest.permission.ACCESS_WIFI_STATE,
            };
        } else {
            permissions = new String[]{
                Manifest.permission.CAMERA,
                Manifest.permission.RECORD_AUDIO,
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            };
        }
        
        // Request all permissions
        boolean needsRequest = false;
        for (String perm : permissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                needsRequest = true;
                break;
            }
        }
        
        if (needsRequest) {
            ActivityCompat.requestPermissions(this, permissions, 100);
        }
    }
}