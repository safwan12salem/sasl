import Foundation
import Capacitor

@objc(WaveMeshPlugin)
public class WaveMeshPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WaveMeshPlugin"
    public let jsName = "WaveMeshPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setIdentity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startBLEScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopBLEScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connectToPeer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendOverBLE", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startMultipeerDiscovery", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sendOverMultipeer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]
    
    private let waveMesh = WaveMeshNativeService.shared
    
    override public func load() {
        waveMesh.onPeerDiscovered = { [weak self] deviceId, name, connectionType, distance in
            self?.notifyListeners("peerDiscovered", data: [
                "deviceId": deviceId,
                "name": name,
                "connectionType": connectionType,
                "distance": distance
            ])
        }
        
        waveMesh.onPeerConnected = { [weak self] deviceId, name in
            self?.notifyListeners("peerConnected", data: [
                "deviceId": deviceId,
                "name": name
            ])
        }
        
        waveMesh.onMessageReceived = { [weak self] from, text in
            self?.notifyListeners("messageReceived", data: [
                "from": from,
                "text": text
            ])
        }
        
        waveMesh.onICECandidate = { [weak self] from, candidate in
            self?.notifyListeners("iceCandidate", data: [
                "from": from,
                "candidate": candidate
            ])
        }
        
        print("📱 WaveMeshPlugin iOS loaded")
    }
    
    @objc func setIdentity(_ call: CAPPluginCall) {
        let id = call.getString("id") ?? "unknown"
        let username = call.getString("username") ?? "User"
        waveMesh.setIdentity(id: id, username: username)
        call.resolve()
    }
    
    @objc func startBLEScan(_ call: CAPPluginCall) {
        waveMesh.startBLEScan()
        waveMesh.startMultipeerDiscovery()
        call.resolve()
    }
    
    @objc func stopBLEScan(_ call: CAPPluginCall) {
        waveMesh.stopBLEScan()
        waveMesh.stopMultipeer()
        call.resolve()
    }
    
    @objc func connectToPeer(_ call: CAPPluginCall) {
        if let deviceAddress = call.getString("deviceAddress") {
            waveMesh.connectToPeer(deviceAddress)
        }
        call.resolve()
    }
    
    @objc func sendOverBLE(_ call: CAPPluginCall) {
        let peerAddress = call.getString("peerAddress") ?? ""
        let type = call.getString("type", "MSG")
        let data = call.getString("data", "")
        waveMesh.sendOverBLE(peerAddress: peerAddress, type: type, data: data)
        call.resolve()
    }
    
    @objc func startMultipeerDiscovery(_ call: CAPPluginCall) {
        waveMesh.startMultipeerDiscovery()
        call.resolve()
    }
    
    @objc func sendOverMultipeer(_ call: CAPPluginCall) {
        let text = call.getString("text", "")
        waveMesh.sendOverMultipeer(text)
        call.resolve()
    }
    
    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve(waveMesh.getCapabilities())
    }
    
    @objc func stop(_ call: CAPPluginCall) {
        waveMesh.stopBLEScan()
        waveMesh.stopMultipeer()
        call.resolve()
    }
}
    @objc func startAdvertising(_ call: CAPPluginCall) {
        let username = call.getString("username") ?? "SaslUser"
        waveMesh.startAdvertising(username: username)
        call.resolve()
    }
    
    @objc func stopAdvertising(_ call: CAPPluginCall) {
        waveMesh.stopAdvertising()
        call.resolve()
    }
