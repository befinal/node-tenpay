import { Utf8AsciiLatin1Encoding } from "crypto";
import crypto = require("crypto");
import * as xml2js from "xml2js";

export function decrypt(encryptedData: string, key: string, iv = "") {
  let decipher = crypto.createDecipheriv("aes-256-ecb", key, iv);
  decipher.setAutoPadding(true);
  let decoded = decipher.update(encryptedData, "base64", "utf8");
  decoded += decipher.final("utf8");
  return decoded;
}

export function md5(
  str: string,
  encoding: Utf8AsciiLatin1Encoding = "utf8"
): string {
  return crypto.createHash("md5").update(str, encoding).digest("hex");
}

export function sha256(
  str: string,
  key: string,
  encoding: Utf8AsciiLatin1Encoding = "utf8"
): string {
  return crypto.createHmac("sha256", key).update(str, encoding).digest("hex");
}

export function encryptRSA(key: string, hash: string): string {
  return crypto.publicEncrypt(key, Buffer.from(hash)).toString("base64");
}

export function checkXML(str: string): boolean {
  let reg = /^(<\?xml.*\?>)?(\r?\n)*<xml>(.|\r?\n)*<\/xml>$/i;
  return reg.test(str.trim());
}

export function getFullDate(): string {
  const str = new Date();
  let YYYY = str.getFullYear();
  let MM = ("00" + (str.getMonth() + 1)).substr(-2);
  let DD = ("00" + str.getDate()).substr(-2);
  return YYYY + MM + DD;
}

export function toQueryString(obj: Record<string, string>): string {
  return Object.keys(obj)
    .filter((key) => key !== "sign" && obj[key] !== void 0 && obj[key] !== "")
    .sort()
    .map((key) => key + "=" + obj[key])
    .join("&");
}

export function generate(length = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let noceStr = "",
    maxPos = chars.length;
  while (length--) noceStr += chars[(Math.random() * maxPos) | 0];
  return noceStr;
}

export function buildXML(obj: any, rootName = "xml") {
  const opt = <xml2js.OptionsV2>{
    xmldec: undefined,
    rootName,
    allowSurrogateChars: true,
    cdata: true,
  };
  return new xml2js.Builder(opt as xml2js.OptionsV2).buildObject(obj);
}

export function parseXML(xml: string): Promise<any> {
  const opt = { trim: true, explicitArray: false, explicitRoot: false };
  return xml2js.parseStringPromise(xml, opt);
}
