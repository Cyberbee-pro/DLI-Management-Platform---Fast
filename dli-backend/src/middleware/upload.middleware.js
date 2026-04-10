const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDir = path.join(__dirname, "../../public/uploads");

const avatarMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const resumeMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    fs.mkdirSync(uploadDir, { recursive: true });
    callback(null, uploadDir);
  },
  filename(_req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, extension)
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 48);

    callback(
      null,
      `${Date.now()}-${baseName || file.fieldname}${extension}`,
    );
  },
});

function fileFilter(_req, file, callback) {
  if (file.fieldname === "avatar" && avatarMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  if (file.fieldname === "resume" && resumeMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(
    new Error(
      file.fieldname === "avatar"
        ? "Avatar uploads must be JPEG, PNG, WEBP, or GIF files."
        : "Resume uploads must be PDF, DOC, or DOCX files.",
    ),
  );
}

const profileUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = {
  profileUpload,
  uploadDir,
};
