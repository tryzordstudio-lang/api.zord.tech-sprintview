const fs = require("fs/promises");
const path = require("path");
const { env } = require("../config/env");

class StorageService {
  async uploadBuffer({ key, buffer, contentType }) {
    const normalizedKey = this.normalizeKey(key);
    const outputPath = path.join(process.cwd(), "generated", normalizedKey);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, buffer);

    const baseUrl = env.appUrl.replace(/\/$/, "");
    const contentExtension = this.resolveExtension(contentType);
    const publicKey = normalizedKey.endsWith(contentExtension)
      ? normalizedKey
      : `${normalizedKey}${contentExtension}`;

    if (publicKey !== normalizedKey) {
      const renamedPath = path.join(process.cwd(), "generated", publicKey);
      await fs.rename(outputPath, renamedPath);
    }

    return `${baseUrl}/generated/${publicKey}`;
  }

  normalizeKey(key) {
    const normalized = path.posix.normalize(`/${String(key || "").replaceAll("\\", "/")}`);
    return normalized.replace(/^\/+/, "").replace(/^(\.\.(\/|$))+/, "");
  }

  resolveExtension(contentType) {
    if (contentType === "application/pdf") {
      return ".pdf";
    }

    if (contentType === "text/html") {
      return ".html";
    }

    if (contentType === "application/msword") {
      return ".doc";
    }

    return "";
  }
}

const storageService = new StorageService();

module.exports = { storageService };
