#import "AppDelegate.h"
#import "WebBridge.h"

@interface AppDelegate ()
@property (strong) WebBridge *webBridge;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSRect frame = NSMakeRect(0, 0, 1280, 840);
    self.window = [[NSWindow alloc] initWithContentRect:frame
                                              styleMask:NSWindowStyleMaskTitled |
                                                        NSWindowStyleMaskClosable |
                                                        NSWindowStyleMaskMiniaturizable |
                                                        NSWindowStyleMaskResizable
                                                backing:NSBuffered
                                                  defer:NO];
    [self.window center];
    [self.window setTitle:@"High-Performance Document Editor"];

    WKWebViewConfiguration *config = [[WKWebViewConfiguration alloc] init];
    self.webBridge = [[WebBridge alloc] init];
    [config.userContentController addScriptMessageHandler:self.webBridge name:@"nativeFileDialog"];

    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:config];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webBridge.webView = self.webView;

    [self.window.contentView addSubview:self.webView];
    [self.window makeKeyAndOrderFront:nil];

    NSString *htmlPath = [[NSBundle mainBundle] pathForResource:@"index" ofType:@"html" inDirectory:@"dist"];
    if (htmlPath) {
        NSURL *url = [NSURL fileURLWithPath:htmlPath];
        [self.webView loadFileURL:url allowingReadAccessToURL:url.URLByDeletingLastPathComponent];
    } else {
        NSURL *devUrl = [NSURL URLWithString:@"http://localhost:5173"];
        [self.webView loadRequest:[NSURLRequest requestWithURL:devUrl]];
    }

    [self setupMenuBar];
}

- (void)setupMenuBar {
    NSMenu *mainMenu = [[NSMenu alloc] init];

    // App Menu
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"Quit Document Editor" action:@selector(terminate:) keyEquivalent:@"q"];
    [appMenuItem setSubmenu:appMenu];
    [mainMenu addItem:appMenuItem];

    // File Menu
    NSMenuItem *fileMenuItem = [[NSMenuItem alloc] init];
    NSMenu *fileMenu = [[NSMenu alloc] initWithTitle:@"File"];
    NSMenuItem *openItem = [[NSMenuItem alloc] initWithTitle:@"Open..." action:@selector(handleOpenDocument:) keyEquivalent:@"o"];
    NSMenuItem *saveItem = [[NSMenuItem alloc] initWithTitle:@"Save..." action:@selector(handleSaveDocument:) keyEquivalent:@"s"];
    [fileMenu addItem:openItem];
    [fileMenu addItem:saveItem];
    [fileMenuItem setSubmenu:fileMenu];
    [mainMenu addItem:fileMenuItem];

    // Edit Menu
    NSMenuItem *editMenuItem = [[NSMenuItem alloc] init];
    NSMenu *editMenu = [[NSMenu alloc] initWithTitle:@"Edit"];
    NSMenuItem *undoItem = [[NSMenuItem alloc] initWithTitle:@"Undo" action:@selector(triggerCommand:) keyEquivalent:@"z"];
    [undoItem setRepresentedObject:@"format.undo"];
    [editMenu addItem:undoItem];

    NSMenuItem *redoItem = [[NSMenuItem alloc] initWithTitle:@"Redo" action:@selector(triggerCommand:) keyEquivalent:@"Z"];
    [redoItem setKeyEquivalentModifierMask:NSEventModifierFlagCommand | NSEventModifierFlagShift];
    [redoItem setRepresentedObject:@"format.redo"];
    [editMenu addItem:redoItem];
    [editMenuItem setSubmenu:editMenu];
    [mainMenu addItem:editMenuItem];

    // Format Menu
    NSMenuItem *formatMenuItem = [[NSMenuItem alloc] init];
    NSMenu *formatMenu = [[NSMenu alloc] initWithTitle:@"Format"];
    NSMenuItem *boldItem = [[NSMenuItem alloc] initWithTitle:@"Bold" action:@selector(triggerCommand:) keyEquivalent:@"b"];
    [boldItem setRepresentedObject:@"format.bold"];
    [formatMenu addItem:boldItem];

    NSMenuItem *italicItem = [[NSMenuItem alloc] initWithTitle:@"Italic" action:@selector(triggerCommand:) keyEquivalent:@"i"];
    [italicItem setRepresentedObject:@"format.italic"];
    [formatMenu addItem:italicItem];
    [formatMenuItem setSubmenu:formatMenu];
    [mainMenu addItem:formatMenuItem];

    [NSApp setMainMenu:mainMenu];
}

- (void)handleOpenDocument:(id)sender {
    [self.webBridge presentOpenPanel];
}

- (void)handleSaveDocument:(id)sender {
    [self.webView evaluateJavaScript:@"window.editorEngine?.getFullText() || ''" completionHandler:^(id result, NSError *error) {
        NSString *text = [result isKindOfClass:[NSString class]] ? result : @"";
        [self.webBridge presentSavePanelWithContent:text];
    }];
}

- (void)triggerCommand:(NSMenuItem *)sender {
    NSString *commandId = [sender representedObject];
    if (commandId) {
        NSString *js = [NSString stringWithFormat:@"window.commandRegistry?.execute('%@');", commandId];
        [self.webView evaluateJavaScript:js completionHandler:nil];
    }
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

@end
