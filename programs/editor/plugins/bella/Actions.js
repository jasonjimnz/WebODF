/**
 * Copyright (C) 2014-2015 KO GmbH <copyright@kogmbh.com>
 *
 * @licstart
 * This file is part of WebODF.
 *
 * WebODF is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License (GNU AGPL)
 * as published by the Free Software Foundation, either version 3 of
 * the License, or (at your option) any later version.
 *
 * WebODF is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with WebODF.  If not, see <http://www.gnu.org/licenses/>.
 * @licend
 *
 * @source: http://www.webodf.org/
 * @source: https://github.com/kogmbh/WebODF/
 */


define("webodf/editor/plugins/bella/Actions", function() {
    "use strict";

    /**
     * @constructor
     * @param {!gui.SessionController} controllers
     */
    function Actions(controllers, random, config) {
        var session,
            odtDocument,
            canvas,
            selectionController = controllers.getSelectionController(),
            textController = controllers.getTextController(),
            directFormattingController = controllers.getDirectFormattingController(),
            annotationController = controllers.getAnnotationController(),
            pasteboard = [],
            MAX_PASTEBOARD_SIZE = 1000;

        function shrinkPasteboard() {
            var index;
            if (pasteboard.length > MAX_PASTEBOARD_SIZE) {
                index = random.getInt(0, pasteboard.length);
                pasteboard.splice(index, 1);
            }
        }

        function getCursor() {
            return odtDocument.getCursor(controllers.getInputMemberId());
        }

        function getRandomPoint() {
            var container = odtDocument.getRootNode(),// TODO use canvas.getElement or even document.body instead
                offset = random.getInt(0, container.childNodes.length + 1);

            while (container.childNodes[offset] && random.oneIn(10) === false) { // Should descend?
                container = container.childNodes[offset];
                if (container.length) {
                    // Might be a text node
                    offset = random.getInt(0, container.length + 1);
                } else {
                    offset = random.getInt(0, container.childNodes.length + 1);
                }
            }
            return { container: container, offset: offset };
        }

        function moveToPoint() {
            var focusPoint = getRandomPoint(),
                selection = selectionController.selectionToRange({
                    anchorNode: focusPoint.container,
                    anchorOffset: focusPoint.offset,
                    focusNode: focusPoint.container,
                    focusOffset: focusPoint.offset
                });

            selectionController.selectRange(selection.range, selection.hasForwardSelection, random.oneIn(4));
        }

        /**
         * Reduce the probability of removing large slabs of the document by a factor of 5
         * @param {!function():undefined} callback
         * @return {!function():undefined}
         */
        function reducedDestruction(callback) {
            return function () {
                var cursor = getCursor();
                if (!cursor.getSelectedRange().collapsed
                    // Selection length can be for a reverse selection
                    && Math.abs(odtDocument.getCursorSelection(controllers.getInputMemberId()).length) > 40
                    && random.oneIn(10) === false) {
                    moveToPoint();
                }
                callback();
            }
        }

        this.moveToPoint = moveToPoint;

        this.extendToPoint = function () {
            var cursor = getCursor(),
                currentSelection = selectionController.rangeToSelection(cursor.getSelectedRange(), cursor.hasForwardSelection()),
                focusPoint = getRandomPoint(),
                newSelection;

            currentSelection.focusNode = focusPoint.container;
            currentSelection.focusOffset = focusPoint.offset;
            newSelection = selectionController.selectionToRange(currentSelection);
            selectionController.selectRange(newSelection.range, newSelection.hasForwardSelection, random.getInt(0, 4));
        };

        this.selectByRange = function () {
            var focusPoint = getRandomPoint(),
                anchorPoint = getRandomPoint(),
                selection = selectionController.selectionToRange({
                    anchorNode: anchorPoint.container,
                    anchorOffset: anchorPoint.offset,
                    focusNode: focusPoint.container,
                    focusOffset: focusPoint.offset
                });

            selectionController.selectRange(selection.range, selection.hasForwardSelection, random.getInt(0, 4));
        };

        this.moveCursorToLeft = selectionController.moveCursorToLeft;
        this.moveCursorToRight = selectionController.moveCursorToRight;
        this.extendSelectionToLeft = selectionController.extendSelectionToLeft;
        this.extendSelectionToRight = selectionController.extendSelectionToRight;
        this.moveCursorUp = selectionController.moveCursorUp;
        this.moveCursorDown = selectionController.moveCursorDown;
        this.extendSelectionUp = selectionController.extendSelectionUp;
        this.extendSelectionDown = selectionController.extendSelectionDown;
        this.moveCursorBeforeWord = selectionController.moveCursorBeforeWord;
        this.moveCursorPastWord = selectionController.moveCursorPastWord;
        this.extendSelectionBeforeWord = selectionController.extendSelectionBeforeWord;
        this.extendSelectionPastWord = selectionController.extendSelectionPastWord;
        this.moveCursorToLineStart = selectionController.moveCursorToLineStart;
        this.moveCursorToLineEnd = selectionController.moveCursorToLineEnd;
        this.extendSelectionToLineStart = selectionController.extendSelectionToLineStart;
        this.extendSelectionToLineEnd = selectionController.extendSelectionToLineEnd;
        this.extendSelectionToParagraphStart = selectionController.extendSelectionToParagraphStart;
        this.extendSelectionToParagraphEnd = selectionController.extendSelectionToParagraphEnd;
        this.moveCursorToDocumentStart = selectionController.moveCursorToDocumentStart;
        this.moveCursorToDocumentEnd = selectionController.moveCursorToDocumentEnd;
        this.extendSelectionToDocumentStart = selectionController.extendSelectionToDocumentStart;
        this.extendSelectionToDocumentEnd = selectionController.extendSelectionToDocumentEnd;
        this.extendSelectionToEntireDocument = selectionController.extendSelectionToEntireDocument;

        this.sayMeow = reducedDestruction(function () {
            var meows = random.getInt(0, 10),
                text = config.utterance || "meow";
            while (meows) {
                textController.insertText("  " + text + "!  ");
                meows -= 1;
            }
        });

        this.enqueueParagraphSplittingOps = reducedDestruction(textController.enqueueParagraphSplittingOps);
        this.removeTextByDeleteKey = reducedDestruction(textController.removeTextByDeleteKey);
        this.removeTextByBackspaceKey = reducedDestruction(textController.removeTextByBackspaceKey);

        if (config.undo) {
        this.undo = controllers.undo;
        this.redo = controllers.redo;
        }

        function runWithRandomBool(func) {
            return function () {
                return func(random.getBool());
            };
        }

        this.setBold = runWithRandomBool(directFormattingController.setBold);
        this.setItalic = runWithRandomBool(directFormattingController.setItalic);
        this.setHasUnderline = runWithRandomBool(directFormattingController.setHasUnderline);
        this.setHasStrikethrough = runWithRandomBool(directFormattingController.setHasStrikethrough);

        this.setFontSize = function () {
            directFormattingController.setFontSize(random.getInt(7, 120));
        };

        function toggleAndInsertText(func) {
            var text = config.utteranceLoud || "MeOW";
            return reducedDestruction(function () {
                func(random.getBool());
                textController.insertText(" !!!! " + text + "!");
            });
        }

        this.setBoldAndAddText = toggleAndInsertText(directFormattingController.setBold);
        this.setItalicAndAddText = toggleAndInsertText(directFormattingController.setItalic);
        this.setHasUnderlineAndAddText = toggleAndInsertText(directFormattingController.setHasUnderline);
        this.setHasStrikethroughAndAddText = toggleAndInsertText(directFormattingController.setHasStrikethrough);

        this.toggleBold = directFormattingController.toggleBold;
        this.toggleItalic = directFormattingController.toggleItalic;
        this.toggleUnderline = directFormattingController.toggleUnderline;
        this.toggleStrikethrough = directFormattingController.toggleStrikethrough;

        this.alignParagraphLeft = directFormattingController.alignParagraphLeft;
        this.alignParagraphCenter = directFormattingController.alignParagraphCenter;
        this.alignParagraphRight = directFormattingController.alignParagraphRight;
        this.alignParagraphJustified = directFormattingController.alignParagraphJustified;
        this.indent = directFormattingController.indent;
        this.outdent = directFormattingController.outdent;

        if (config.annotations) {
        this.createAnnotation = annotationController.addAnnotation;
        this.removeAnnotation = function() {
            var container = odtDocument.getRootNode(),// TODO use canvas.getElement or even document.body instead
                annotations = container.getElementsByTagNameNS(odf.Namespaces.officens, "annotation"),
                index;
            if (annotations.length > 0) {
                index = random.getInt(0, annotations.length);
                annotationController.removeAnnotation(annotations[index]);
            }
        };
        }

        this.pretendCut = reducedDestruction(function () {
            var range = getCursor().getSelectedRange(),
                data = controllers.simulateCopy(range);

            if (data) {
                pasteboard.push(data);
                shrinkPasteboard();
            }
            textController.removeCurrentSelection();
        });

        this.pretendCopy = function () {
            var range = getCursor().getSelectedRange(),
                data = controllers.simulateCopy(range);

            if (data) {
                pasteboard.push(data);
                shrinkPasteboard();
            }
        };

        this.pretendPaste = reducedDestruction(function () {
            var data = random.getElement(pasteboard);
            if (data) {
                textController.removeCurrentSelection();
                controllers.simulatePaste(data);
            }
        });

        function init() {
            session = controllers.getSession();
            odtDocument = session.getOdtDocument();
            canvas = odtDocument.getCanvas();
        }

        init();
    }

    return Actions;
});