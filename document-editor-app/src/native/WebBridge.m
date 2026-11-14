#import "WebBridge.h"
#import <AppKit/AppKit.h>

@implementation WebBridge

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.name isEqualToString:@"nativeFileDialog"]) return;
    if (![message.body isKindOfClass:[NSDictionary class]]) return;

    NSDictionary *payload = (NSDictionary *)message.body;
    NSString *action = payload[@"action"];

    if ([action isEqualToString:@"open"]) {
        [self presentOpenPanel];
    } else if ([action isEqualToString:@"save"]) {
        NSString *content = [payload[@"content"] isKindOfClass:[NSString class]] ? payload[@"content"] : @"";
        [self presentSavePanelWithContent:content];
    }
}

- (void)presentOpenPanel {
    NSOpenPanel *panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = YES;
    panel.canChooseDirectories = NO;
    panel.allowsMultipleSelection = NO;

    [panel beginWithCompletionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK && panel.URL) {
            NSError *err = nil;
            NSString *fileContent = [NSString stringWithContentsOfURL:panel.URL
                                                             encoding:NSUTF8StringEncoding
                                                                error:&err];
            if (fileContent && !err) {
                NSData *jsonData = [NSJSONSerialization dataWithJSONObject:@{@"content": fileContent}
                                                                   options:0
                                                                     error:nil];
                NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                NSString *js = [NSString stringWithFormat:@"window.dispatchEvent(new CustomEvent('native-file-opened', { detail: %@ }));", jsonString];
                [self.webView evaluateJavaScript:js completionHandler:nil];
            }
        }
    }];
}

- (void)presentSavePanelWithContent:(NSString *)content {
    NSSavePanel *panel = [NSSavePanel savePanel];
    panel.nameFieldStringValue = @"document.txt";

    [panel beginWithCompletionHandler:^(NSModalResponse result) {
        if (result == NSModalResponseOK && panel.URL) {
            [content writeToURL:panel.URL
                     atomically:YES
                       encoding:NSUTF8StringEncoding
                          error:nil];
        }
    }];
}

@end
