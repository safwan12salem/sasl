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
                peer.put("deviceId", deviceId); peer.put("name", name);
                peer.put("connectionType", connectionType); peer.put("distance", distance);
                notifyListeners("peerDiscovered", peer);
            }
            @Override
            public void onPeerConnected(String deviceId, String name) {
                JSObject peer = new JSObject();
                peer.put("deviceId", deviceId); peer.put("name", name);
                notifyListeners("peerConnected", peer);
            }
            @Override
            public void onMessageReceived(String from, String text) {
                JSObject msg = new JSObject();
                msg.put("from", from); msg.put("text", text);
                notifyListeners("messageReceived", msg);
            }
            @Override
            public void onICECandidate(String from, String candidate) {}
            @Override
            public void onStatusChanged(String status) {
                JSObject s = new JSObject(); s.put("status", status);
                notifyListeners("statusChanged", s);
            }
        });
        Log.d(TAG, "WaveMeshPlugin loaded");
    }
    
    @PluginMethod public void setIdentity(PluginCall call) {
        waveMeshService.setIdentity(call.getString("id",""), call.getString("username","User"));
        call.resolve();
    }
    @PluginMethod public void startAdvertising(PluginCall call) {
        waveMeshService.startAdvertising(call.getString("username", "SaslUser"));
        call.resolve();
    }
    @PluginMethod public void stopAdvertising(PluginCall call) {
        waveMeshService.stopAdvertising(); call.resolve();
    }
    @PluginMethod public void startBLEScan(PluginCall call) {
        waveMeshService.startBLEScan(); call.resolve();
    }
    @PluginMethod public void stopBLEScan(PluginCall call) {
        waveMeshService.stopBLEScan(); call.resolve();
    }
    @PluginMethod public void connectToPeer(PluginCall call) {
        waveMeshService.connectToPeer(call.getString("deviceAddress",""));
        call.resolve();
    }
    @PluginMethod public void sendMessage(PluginCall call) {
        waveMeshService.sendMessage(call.getString("deviceAddress",""), call.getString("message",""));
        call.resolve();
    }
    @PluginMethod public void getCapabilities(PluginCall call) {
        JSObject caps = new JSObject();
        caps.put("bleReady", waveMeshService.isBleReady());
        caps.put("isAdvertising", waveMeshService.isAdvertising());
        caps.put("isScanning", waveMeshService.isScanning());
        call.resolve(caps);
    }
    @PluginMethod public void stop(PluginCall call) {
        waveMeshService.stop(); call.resolve();
    }


        @PluginMethod public void startRelayService(PluginCall call) {
        Intent intent = new Intent(getContext(), EchoRelayService.class);
        intent.putExtra("username", call.getString("username", "RelayNode"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
        call.resolve();
    }

    @PluginMethod public void stopRelayService(PluginCall call) {
        Intent intent = new Intent(getContext(), EchoRelayService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
