import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import {readdirSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("./public/assets",import.meta.url));
function files(dir:string):string[]{
  return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const path=join(dir,entry.name);
    return entry.isDirectory()?files(path):[path];
  });
}
export default defineConfig({plugins:[react(),{
  name:"ripple-asset-index",
  resolveId(id){if(id==="virtual:ripple-assets")return "\0"+id},
  load(id){
    if(id!=="\0virtual:ripple-assets")return;
    const hash=createHash("sha256");
    const assets=files(root).sort().map(path=>{
      this.addWatchFile(path);
      const url="/assets/"+path.slice(root.length+1).replaceAll("\\","/");
      const bytes=readFileSync(path);hash.update(url).update(bytes);
      return {url,size:bytes.length};
    });
    return "export default "+JSON.stringify({version:hash.digest("hex").slice(0,16),assets});
  }
}],server:{fs:{allow:["../.."]}}});
