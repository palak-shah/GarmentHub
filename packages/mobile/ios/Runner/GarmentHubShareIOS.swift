import Flutter
import Foundation
import Intents
import UIKit

/// Native share targets: `INSendMessageIntent` donation + App Group handoff for the share extension.
enum GarmentHubShareIOS {
  static let appGroup = "group.com.garmenthub.garmenthubMobile"
  static let channelName = "com.garmenthub/share_targets"
  /// No public iOS API for share-row count; cap donations to avoid INInteraction churn.
  static let maxDonationCap = 20
  static let kPaths = "gh_share_handoff_paths"
  static let kProductId = "gh_share_handoff_product_id"
  static let kProductName = "gh_share_handoff_product_name"

  private static var methodChannel: FlutterMethodChannel?

  static func register(engineBridge: FlutterImplicitEngineBridge) {
    let messenger = engineBridge.dartEngine.binaryMessenger
    let channel = FlutterMethodChannel(name: channelName, binaryMessenger: messenger)
    methodChannel = channel
    channel.setMethodCallHandler { call, result in
      handle(call: call, result: result)
    }
  }

  static func handleOpenURLContexts(_ contexts: Set<UIOpenURLContext>) {
    // Handoff payload is in App Group UserDefaults; opening the URL only foregrounds the app.
    _ = contexts
  }

  private static func handle(call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "syncShareTargets":
      guard let list = call.arguments as? [[String: Any]] else {
        result(nil)
        return
      }
      donateShareTargets(recents: list)
      result(nil)
    case "consumeShareProductExtra":
      result([
        "productId": NSNull(),
        "productName": NSNull(),
        "resolvedSource": NSNull(),
        "intentDataPreview": NSNull(),
      ])
    case "peekShareProductExtra":
      result([
        "productId": NSNull(),
        "productName": NSNull(),
        "resolvedSource": NSNull(),
        "intentDataPreview": NSNull(),
      ])
    case "consumeIosShareHandoff":
      result(consumeHandoffMap())
    case "getMaxShareTargets":
      result(GarmentHubShareIOS.maxDonationCap)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  private static func consumeHandoffMap() -> [String: Any]? {
    guard let def = UserDefaults(suiteName: appGroup) else { return nil }
    let paths = def.stringArray(forKey: kPaths)
    let pid = def.string(forKey: kProductId)
    let pname = def.string(forKey: kProductName)
    guard let paths, !paths.isEmpty else { return nil }
    def.removeObject(forKey: kPaths)
    def.removeObject(forKey: kProductId)
    def.removeObject(forKey: kProductName)
    def.synchronize()
    var map: [String: Any] = ["paths": paths]
    if let pid { map["productId"] = pid }
    if let pname { map["productName"] = pname }
    return map
  }

  private static func donateShareTargets(recents: [[String: Any]]) {
    for item in recents.prefix(maxDonationCap) {
      guard let id = item["id"] as? String, !id.isEmpty else { continue }
      let name = (item["name"] as? String) ?? ""
      let phrase = INSpeakableString(spokenPhrase: name.isEmpty ? "Listing" : name)
      let intent = INSendMessageIntent(
        recipients: nil,
        outgoingMessageType: .outgoingMessageText,
        content: nil,
        speakableGroupName: phrase,
        conversationIdentifier: id,
        serviceName: nil,
        sender: nil,
        attachments: nil
      )
      let interaction = INInteraction(intent: intent, response: nil)
      interaction.direction = .outgoing
      interaction.donate { _ in }
    }
  }
}
