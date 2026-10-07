export const paymentReply=(body: object,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
export async function boundedJson(request: Request,max=1024): Promise<Record<string,unknown>> {
 if(!request.headers.get("content-type")?.startsWith("application/json"))throw Error("invalid_request");
 const reader=request.body?.getReader();if(!reader)throw Error("invalid_request");
 const chunks: Uint8Array[]=[];let size=0;
 while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();throw Error("invalid_request");}chunks.push(part.value);}
 const value: unknown=JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("invalid_request");return value as Record<string,unknown>;
}
