import Intents
import UIKit
import UniformTypeIdentifiers

private let kAppGroup = "group.com.garmenthub.garmenthubMobile"
private let kPaths = "gh_share_handoff_paths"
private let kProductId = "gh_share_handoff_product_id"
private let kProductName = "gh_share_handoff_product_name"

@objc(ShareViewController)
class ShareViewController: UIViewController {
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    Task { await handleShare() }
  }

  private func handleShare() async {
    guard let ctx = extensionContext else { return }
    defer {
      ctx.completeRequest(returningItems: [], completionHandler: nil)
    }

    var productId: String?
    var productName: String?
    if let intent = ctx.intent as? INSendMessageIntent {
      productId = intent.conversationIdentifier
      productName = intent.speakableGroupName?.spokenPhrase
    }

    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: kAppGroup) else {
      return
    }
    let staging = container.appendingPathComponent("share_import", isDirectory: true)
    try? FileManager.default.removeItem(at: staging)
    try? FileManager.default.createDirectory(at: staging, withIntermediateDirectories: true)

    var paths: [String] = []
    var idx = 0
    for item in ctx.inputItems as? [NSExtensionItem] ?? [] {
      for provider in item.attachments ?? [] {
        let typeId = UTType.image.identifier
        guard provider.hasItemConformingToTypeIdentifier(typeId) else { continue }
        if let url = await loadImage(from: provider, typeId: typeId, index: idx, staging: staging) {
          paths.append(url.path)
          idx += 1
        }
      }
    }

    guard !paths.isEmpty else { return }
    guard let def = UserDefaults(suiteName: kAppGroup) else { return }
    def.set(paths, forKey: kPaths)
    def.set(productId, forKey: kProductId)
    def.set(productName, forKey: kProductName)
    def.synchronize()

    guard let openURL = URL(string: "garmenthub://handoff") else { return }
    ctx.open(openURL, completionHandler: nil)
  }

  private func loadImage(from provider: NSItemProvider, typeId: String, index: Int, staging: URL) async -> URL? {
    await withCheckedContinuation { cont in
      provider.loadItem(forTypeIdentifier: typeId, options: nil) { item, _ in
        let dest = staging.appendingPathComponent("img_\(index).jpg")
        if let u = item as? URL {
          do {
            if FileManager.default.fileExists(atPath: dest.path) {
              try FileManager.default.removeItem(at: dest)
            }
            try FileManager.default.copyItem(at: u, to: dest)
            cont.resume(returning: dest)
          } catch {
            cont.resume(returning: nil)
          }
          return
        }
        if let img = item as? UIImage, let data = img.jpegData(compressionQuality: 0.9) {
          do {
            try data.write(to: dest)
            cont.resume(returning: dest)
          } catch {
            cont.resume(returning: nil)
          }
          return
        }
        cont.resume(returning: nil)
      }
    }
  }
}
