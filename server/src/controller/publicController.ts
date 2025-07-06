import { Request, Response } from "express";
import { getSignedUrlFromPath } from "../utils/s3Utils";

const getPublicFile = async (req: Request, res: Response) => {
  try {
    const { path } = req.query;

    if (!path || typeof path !== "string") {
      return res.status(400).json({ message: "File path is required" });
    }

    // Validate that the path is for public files only (security check)
    if (!path.startsWith("public/")) {
      return res
        .status(403)
        .json({ message: "Access denied - only public files are allowed" });
    }

    const signedUrl = await getSignedUrlFromPath(path);

    res.json({ signedUrl });
  } catch (error) {
    console.error("Get public file URL error:", error);
    res.status(500).json({ message: "Failed to get file URL" });
  }
};

export default {
  getPublicFile,
};
