@
const fs = require("fs");
const path = require("path");
const dir = "frontend/src";

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const filePath = path.join(currentDir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
      let content = fs.readFileSync(filePath, "utf8");
      if (content.includes("/api/") && (content.includes("fetch") || content.includes("src="))) {
        console.log("Modifying", filePath);
        if (!content.includes("getApiUrl")) {
          content = "import { getApiUrl } from \"@/utils/config\";\n" + content;
        }
        content = content.replace(/fetch\(([\x27\"\`])\/api\/(.*?)([\x27\"\`])/g, "fetch(getApiUrl($1/api/$2$3))");
        content = content.replace(/src=\{?([\x27\"\`])\/api\/(.*?)([\x27\"\`])\}?/g, "src={getApiUrl($1/api/$2$3)}");
        fs.writeFileSync(filePath, content, "utf8");
      }
    }
  }
}
walk(dir);
@
