/* See license.txt for terms of usage */

define([
    "firebug/lib/trace",
    "firebug/lib/options",
    "firebug/lib/locale",
    "firebug/firefox/browserOverlayLib",
],
function(FBTrace, Options, Locale, BrowserOverlayLib) {
with (BrowserOverlayLib) {

// ********************************************************************************************* //
// Constants

var shortcuts = [
    "toggleFirebug",
    "toggleInspecting",
    "focusCommandLine",
    "detachFirebug",
    "closeFirebug",
    "toggleBreakOn"
];

/* Used by the browser menu, but should be really global shortcuts?
key_increaseTextSize
key_decreaseTextSize
key_normalTextSize
key_help
key_toggleProfiling
key_focusFirebugSearch
key_customizeFBKeys
*/

// ********************************************************************************************* //
// BrowserCommands Implementation

var BrowserCommands =
{
    overlay: function(doc)
    {
        this.overlayCommands(doc);
        this.overlayShortcuts(doc);
    },

    overlayCommands: function(doc)
    {
        $command(doc, "cmd_firebug_closeFirebug", "Firebug.closeFirebug(true);");
        $command(doc, "cmd_firebug_toggleInspecting", "if (!Firebug.currentContext) Firebug.toggleBar(true); Firebug.Inspector.toggleInspecting(Firebug.currentContext);");
        $command(doc, "cmd_firebug_focusCommandLine", "if (!Firebug.currentContext) Firebug.toggleBar(true); Firebug.CommandLine.focus(Firebug.currentContext);");
        $command(doc, "cmd_firebug_toggleFirebug", "Firebug.toggleBar();");
        $command(doc, "cmd_firebug_detachFirebug", "Firebug.toggleDetachBar(false, true);");
        $command(doc, "cmd_firebug_inspect", "Firebug.Inspector.inspectFromContextMenu(arg);", "document.popupNode");
        $command(doc, "cmd_firebug_toggleBreakOn", "if (Firebug.currentContext) Firebug.chrome.breakOnNext(Firebug.currentContext, event);");
        $command(doc, "cmd_firebug_toggleDetachFirebug", "Firebug.toggleDetachBar(false, true);");
        $command(doc, "cmd_firebug_increaseTextSize", "Firebug.Options.changeTextSize(1);");
        $command(doc, "cmd_firebug_decreaseTextSize", "Firebug.Options.changeTextSize(-1);");
        $command(doc, "cmd_firebug_normalTextSize", "Firebug.Options.setTextSize(0);");
        $command(doc, "cmd_firebug_focusFirebugSearch", "if (Firebug.currentContext) Firebug.Search.onSearchCommand(document);");
        $command(doc, "cmd_firebug_customizeFBKeys", "Firebug.ShortcutsModel.customizeShortcuts();");
        $command(doc, "cmd_firebug_enablePanels", "Firebug.PanelActivation.enableAllPanels();");
        $command(doc, "cmd_firebug_disablePanels", "Firebug.PanelActivation.disableAllPanels();");
        $command(doc, "cmd_firebug_clearActivationList", "Firebug.PanelActivation.clearAnnotations();");
        $command(doc, "cmd_firebug_clearConsole", "Firebug.Console.clear(Firebug.currentContext);");
        $command(doc, "cmd_firebug_allOn", "Firebug.PanelActivation.toggleAll('on');");
        $command(doc, "cmd_firebug_toggleOrient", "Firebug.chrome.toggleOrient();");
        $command(doc, "cmd_firebug_resetAllOptions", "Firebug.resetAllOptions(true);");
        $command(doc, "cmd_firebug_toggleProfiling", ""); //todo
        $command(doc, "cmd_firebug_openInEditor", "Firebug.ExternalEditors.onContextMenuCommand(event)");
    },

    overlayShortcuts: function(doc)
    {
        function getShortcutInfo(shortcut)
        {
            var tokens = shortcut.split(" ");
            var key = tokens.pop();
            var modifiers = tokens.join(",");
            var attr = "";
            if (key.length <= 1)
                attr = "key";
            else if (doc.defaultView.KeyEvent["DOM_"+key])
                attr = "keycode";

            return {attr: attr, key: key, modifiers: modifiers};
        }

        var win = $(doc, "main-window");
        var keyset = $el(doc, "keyset", {id: "firebugKeyset"}, win);

        for (var i = 0; i < shortcuts.length; i++)
        {
            var id = shortcuts[i];
            var shortcut = Options.get("key.shortcut." + id);
            var {attr, key, modifiers} = getShortcutInfo(shortcut);

            var keyProps = {
                id: "key_firebug_" + id,
                modifiers: modifiers,
                command: "cmd_firebug_" + id,
                position: 1
            };
            keyProps[attr] = key;

            $el(doc, "key", keyProps, keyset);

            // Disable existing global shortcuts
            this.disableExistingShortcuts(doc, attr, key, modifiers);
        }

        var self = this;
        // Disable lazy loaded global shortcuts like the ones from the DevTools
        var observer = new doc.defaultView.MutationObserver(function(mutations) {
            for (var mutation of mutations)
            {
                if (mutation.type !== "childList" || mutation.addedNodes.length === 0)
                    continue;

                for (var node of mutation.addedNodes)
                {
                    if (node.nodeName !== "key")
                        continue;

                    for (var i = 0; i < shortcuts.length; i++)
                    {
                        var id = shortcuts[i];
                        var shortcut = Options.get("key.shortcut." + id);
                        var {attr, key, modifiers} = getShortcutInfo(shortcut);

                        // Disable existing global shortcuts
                        self.disableExistingShortcuts.call(self, node, attr, key, modifiers);
                    }
                }
            }
        });

        // configuration of the observer:
        var config = {childList: true, subtree: true};

        // pass in the target node, as well as the observer options
        observer.observe(win, config);

        keyset.parentNode.insertBefore(keyset, keyset.nextSibling);
    },

    disableExistingShortcuts: function(root, attr, key, modifiers)
    {
        var selector = ":-moz-any(key[" + attr + "='" + key + "'], key[" + attr + "='" +
            key.toUpperCase() + "'])" + (modifiers ? "[modifiers='" + modifiers + "']" : "") +
            ":not([id*='firebug']):not([disabled='true'])";

        if (!this.disabledKeyElements)
            this.disabledKeyElements = [];

        var existingKeyElements = root.querySelectorAll(selector);
        for (var i = existingKeyElements.length - 1; i >= 0; i--)
        {
            if (this.disabledKeyElements.indexOf(existingKeyElements[i]) === -1)
            {
                existingKeyElements[i].setAttribute("disabled", "true");
                this.disabledKeyElements.push(existingKeyElements[i]);
            }
        }
    },

    resetDisabledKeys: function()
    {
        if (this.disabledKeyElements)
        {

            for (var element of this.disabledKeyElements)
            {
                FBTrace.sysout("reset", element);
                element.removeAttribute("disabled");
            }
        }

        delete this.disabledKeyElements;
    }
};

// ********************************************************************************************* //
// Registration

return BrowserCommands;

// ********************************************************************************************* //
}});
