package app.sasl.plugin;

import android.content.Context;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.sasl.wavemesh.WaveMeshNativeService;

@CapacitorPlugin(name = "WaveMeshPlugin")
public class WaveMeshPlugin extends Plugin {
    private static final String TAG = "WaveMeshPlugin";
    private WaveMeshNativeService waveMeshService;
    
    @Override
    public void load() {
        Context context = getBridge().getContext();
        waveMeshService = WaveMeshNativeService.getInstance(context);
        
        waveMeshService.setCallback(new WaveMeshNativeService.WaveMeshCallback() {
            @Override
            public void onPeerDiscovered(String deviceId, String name, String connectionType, int distance) {
                JSObject peer = new JSObject();
                peer.put("deviceId", deviceId);
                peer.put("name", name);
                peer.put("connectionType", connectionType);
                peer.put("distance", distance);
                notifyListeners("peerDiscovered", peer);
            }
            
            @Override
            public void onPeerConnected(String deviceId, String name) {
                JSObject peer = new JSObject();
                peer.put("deviceId", deviceId);
                peer.put("name", name);
                notifyListeners("peerConnected", peer);
            }
            
            @Override
            public void onMessageReceived(String from, String text) {
                JSObject msg = new JSObject();
                msg.put("from", from);
                msg.put("text", text);
                notifyListeners("messageReceived", msg);
            }
            
            @Override
            public void onStatusChanged(String status) {
                JSObject stat = new JSObject();
                stat.put("status", status);
                notifyListeners("statusChanged", stat);
            }
        });
        
        Log.d(TAG, "WaveMeshPlugin loaded");
    }
    
    @PluginMethod
    public void setIdentity(PluginCall call) {
        String id = call.getString("id", "unknown");
        String username = call.getString("username", "User");
        waveMeshService.setIdentity(id, username);
        call.resolve();
    }
    
    @PluginMethod
    public void setScreenBrightness(PluginCall call) {
        int level = call.getInt("level", 128);
        waveMeshService.setScreenBrightness(level);
        call.resolve();
    }
    
    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject caps = new JSObject();
        caps.put("bleReady", waveMeshService.isBleReady());
        caps.put("wifiDirectReady", waveMeshService.isWifiDirectReady());
        caps.put("wifiAwareReady", waveMeshService.isWifiAwareReady());
        caps.put("multipeerReady", false);
        caps.put("opticalReady", waveMeshService.isOpticalActive());
        call.resolve(caps);
    }
    
    @PluginMethod
    public void startBLEScan(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void stopBLEScan(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void connectToPeer(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void sendOverBLE(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void startWifiDirectDiscovery(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void sendOverWifiDirect(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void startWifiAwareDiscovery(PluginCall call) {
        call.resolve();
    }
    
    @PluginMethod
    public void stop(PluginCall call) {
        waveMeshService.stop();
        call.resolve();
    }
}
