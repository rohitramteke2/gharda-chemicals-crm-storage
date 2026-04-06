import https from "https";
import fs from "fs";

export const zohoHttpsAgent = new https.Agent({
  ca: fs.readFileSync("D:/Software/SSL GHARDA/2555645900/certs/usertrust.pem")
});