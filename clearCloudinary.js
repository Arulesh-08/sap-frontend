const { v2: cloudinary } = require("cloudinary");
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const FOLDER = "sap-certificates";
const RESOURCE_TYPES = ["image", "raw", "video"];

async function clearFolder() {
  for (const resource_type of RESOURCE_TYPES) {
    console.log(`Deleting ${resource_type} resources under ${FOLDER}/ ...`);
    try {
      const result = await cloudinary.api.delete_resources_by_prefix(`${FOLDER}/`, { resource_type });
      console.log(`  -> deleted:`, Object.keys(result.deleted || {}).length);
    } catch (err) {
      console.error(`  -> error deleting ${resource_type}:`, err.message);
    }
  }

  try {
    await cloudinary.api.delete_folder(FOLDER);
    console.log(`Folder ${FOLDER} removed.`);
  } catch (err) {
    console.error("Could not remove folder (may still contain items or already gone):", err.message);
  }

  console.log("Done.");
}

clearFolder();
