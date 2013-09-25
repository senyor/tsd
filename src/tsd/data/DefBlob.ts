///<reference path="../_ref.ts" />
///<reference path="../../git/GitUtil.ts" />
///<reference path="../../xm/typeOf.ts" />

module tsd {
	'use strict';

	//TODO move ReadOnlyBuffer
	export interface ReadOnlyBuffer {
		toString(encoding?:string, start?:number, end?:number): string;
		length: number;
		slice(start?:number, end?:number): NodeBuffer;
		readUInt8(offset:number, noAsset?:boolean): number;
		readUInt16LE(offset:number, noAssert?:boolean): number;
		readUInt16BE(offset:number, noAssert?:boolean): number;
		readUInt32LE(offset:number, noAssert?:boolean): number;
		readUInt32BE(offset:number, noAssert?:boolean): number;
		readInt8(offset:number, noAssert?:boolean): number;
		readInt16LE(offset:number, noAssert?:boolean): number;
		readInt16BE(offset:number, noAssert?:boolean): number;
		readInt32LE(offset:number, noAssert?:boolean): number;
		readInt32BE(offset:number, noAssert?:boolean): number;
		readFloatLE(offset:number, noAssert?:boolean): number;
		readFloatBE(offset:number, noAssert?:boolean): number;
		readDoubleLE(offset:number, noAssert?:boolean): number;
		readDoubleBE(offset:number, noAssert?:boolean): number;
	}

	export class DefBlob {
		sha:string = null;
		content:ReadOnlyBuffer = null;
		encoding:string = null;

		constructor(sha:string, content:NodeBuffer = null, encoding:string = null) {
			xm.assertVar('sha', sha, 'sha1');
			this.sha = sha;
			this.encoding = encoding;

			xm.ObjectUtil.defineProp(this, 'content', {enumerable: false});
			if (content) {
				this.setContent(content);
			}
			else {
				xm.ObjectUtil.defineProps(this, ['sha', 'content'], {writable: false});
			}
		}

		hasContent():boolean {
			return xm.isValid(this.content);
		}

		setContent(content:NodeBuffer):void {
			//TODO find proper (Node)Buffer assertion
			//xm.assertVar('content', content, 'valid');

			if (xm.isValid(this.content)) {
				throw new Error('content already set: ' + this.sha);
			}
			var sha = git.GitUtil.blobSHAHex(content);
			if (sha !== this.sha) {
				throw new Error('blob sha mismatch: ' + sha + ' != ' + this.sha);
			}

			xm.ObjectUtil.defineProp(this, 'content', {writable: true});
			this.content = content;
			xm.ObjectUtil.defineProp(this, 'content', {writable: false});
		}

		//human friendly
		get shaShort():string {
			return this.sha ? tsd.shaShort(this.sha) : '<no sha>';
		}

		toString():string {
			return this.shaShort;
		}
	}
}
