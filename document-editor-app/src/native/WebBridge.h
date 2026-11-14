#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

@interface WebBridge : NSObject <WKScriptMessageHandler>
@property (weak) WKWebView *webView;
- (void)presentOpenPanel;
- (void)presentSavePanelWithContent:(NSString *)content;
@end
