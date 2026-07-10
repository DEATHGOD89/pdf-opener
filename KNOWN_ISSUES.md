# Known Issues (v1.0.0)

Welcome to **PDF Opener Pro** v1.0.0! 

This release is a production-quality utility designed for developers, power users, and small teams. It is secure, memory-efficient, and fully functional for all core operations: annotate, sign, highlight, merge, split, rotate, and save.

Please be aware of the following known gaps in this release:

1. **No auto-updater**
   - *Impact*: Users must manually download and install new versions from our distribution channels. We will implement Tauri's updater in a future release.

2. **No save-progress bar**
   - *Impact*: When saving a large annotated file, the UI shows a functional, but static, spinner.
   - *Workaround*: Wait for the native save dialog or the success toast notification.

3. **`validatePdfData` is currently unused**
   - *Impact*: Custom validation is bypassed.
   - *Workaround*: None needed. The underlying `pdfjs-dist` engine handles invalid or corrupted PDF files gracefully and correctly triggers our Error Boundary.

4. **`localStorage` 5MB limit on active annotations**
   - *Impact*: The app temporarily buffers your active session's annotations in browser storage before burning them into the PDF. Adding ~60 large signature images *without saving* may hit this limit.
   - *Workaround*: Save your document (`Ctrl+S`) frequently! Saving permanently bakes the annotations into the PDF and clears the buffer.

5. **Highlight placement on rotated pages**
   - *Impact*: If a PDF page is natively rotated (e.g., 90 degrees), placing a new highlight might have slight bounding box alignment discrepancies.
   - *Workaround*: This is a niche edge case. For standard portrait or landscape documents, highlighting is pixel-perfect.
