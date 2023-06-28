export interface DataObject {
  [key: string | number]: string | string[] | number;
}

export function parseText(obj: DataObject) {
  return Object.entries(obj)
    .map(([key, value]) => `${key}|${Array.isArray(value) ? value.join("|") : value}`)
    .join("\n");
}

export function parseTextToObj(chunk: Buffer | string) {
  let data: DataObject = {};
  let str: string;

  if (Buffer.isBuffer(chunk)) {
    chunk[chunk.length - 1] = 0;
    str = chunk.toString("utf-8", 4);
  } else {
    str = chunk;
  }

  str.split("\n").forEach((line) => {
    const [key, ...values] = line.split("|");
    data[key] = values.length > 1 ? values : values[0];
  });

  // const lines = str.split("\n");

  // lines.forEach((line) => {
  //   if (line.startsWith("|")) line = line.slice(1);
  //   const info = line.split("|");

  //   let key = info[0];
  //   let val = info[1];

  //   if (key && val) {
  //     if (val.endsWith("\x00")) val = val.slice(0, -1);
  //     data[key] = val;
  //   }
  // });

  return data;
}
