/** PostgreSQL jsonb::text adds separator spaces and expands exponent notation.
 * Count that stored representation, rather than admitting compact JSON that the
 * existing database constraint will reject after otherwise valid generation. */
export function jsonbStorageBytes(value:unknown){
 const json=JSON.stringify(value);let bytes=Buffer.byteLength(json);
 for(let i=0;i<json.length;i++){
  if(json[i]==='"'){for(i++;i<json.length&&json[i]!=='"';i++)if(json[i]==='\\')i++;continue;}
  if(json[i]===','||json[i]===':'){bytes++;continue;}
  if(json[i]==='-'||/\d/.test(json[i])){
   const start=i;while(i+1<json.length&&/[\d.eE+-]/.test(json[i+1]))i++;
   const token=json.slice(start,i+1),parts=token.match(/^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
   if(parts){const digits=parts[2].length+(parts[3]?.length??0),point=parts[2].length+Number(parts[4]);
    const expanded=parts[1].length+(point<=0?2-point+digits:point>=digits?point:digits+1);bytes+=expanded-token.length;}
  }
 }
 return bytes;
}
