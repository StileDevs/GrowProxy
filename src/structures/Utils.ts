export class TextParser {
  public data: { [key: string]: string };

  constructor(input: string) {
    this.data = {};
    this.parse(input);
  }

  private parse(input: string) {
    const lines = input.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue; // Skip empty lines and comments
      const [key, value] = trimmedLine.split("|");
      if (key && value) {
        this.data[key] = value;
      }
    }
  }

  public get(key: string): string | undefined {
    return this.data[key];
  }

  public set(key: string, value: string): void {
    this.data[key] = value;
  }

  public delete(key: string): void {
    delete this.data[key];
  }

  public toString(endMarker = false): string {
    const entries = Object.entries(this.data)
      .map(([key, value]) => `${key}|${value}`)
      .join("\n");

    return `${entries}${endMarker ? "\nRTENDMARKERBS1001" : ""}`;
  }
}
