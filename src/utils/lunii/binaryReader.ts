/**
 * Binary Reader Utility
 * Inspired by Java's DataInputStream and ByteBuffer but for browsers.
 */
export class BinaryReader {
    private view: DataView;
    private offset: number = 0;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    readInt32(): number {
        const value = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readUint32(): number {
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readInt16(): number {
        const value = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readUint16(): number {
        const value = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return value;
    }

    readByte(): number {
        const value = this.view.getUint8(this.offset);
        this.offset += 1;
        return value;
    }

    readBytes(length: number): Uint8Array {
        const bytes = new Uint8Array(this.view.buffer, this.offset, length);
        this.offset += length;
        return bytes;
    }

    seek(position: number) {
        this.offset = position;
    }

    getOffset(): number {
        return this.offset;
    }
}

export const decodeString = (bytes: Uint8Array): string => {
    return new TextDecoder().decode(bytes).replace(/\0/g, '');
};
