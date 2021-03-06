/// <reference path="../_ref.d.ts" />

'use strict';

import path = require('path');

import Promise = require('bluebird');

import collection = require('../../xm/collection');
import fileIO = require('../../xm/fileIO');

import Def = require('../data/Def');
import DefBlob = require('../data/DefBlob');
import DefVersion = require('../data/DefVersion');
import DefIndex = require('../data/DefIndex');
import defUtil = require('../util/defUtil');

import Options = require('../Options');
import Core = require('./Core');
import CoreModule = require('./CoreModule');

var localExp = /^\.\//;
var leadingExp = /^\.\.\//;

/*
 Resolver: resolve dependencies for given def versions
 */
// TODO add unit test, verify race condition solver works properly
// TODO 'resolve' not good choice (conflicts with promises)
class Resolver extends CoreModule {

	private _active = new collection.Hash<Promise<DefVersion>>();

	constructor(core: Core) {
		super(core, 'Resolver');
	}

	/*
	 bulk version of resolveDepencendies()
	 */
	resolveBulk(list: DefVersion[]): Promise<DefVersion[]> {
		list = defUtil.uniqueDefVersion(list);

		return Promise.map(list, (file: DefVersion) => {
			return this.resolveDeps(file);
		}).return(list);
	}

	/*
	 lazy resolve a DefVersion's dependencies
	 */
	resolveDeps(file: DefVersion): Promise<DefVersion> {
		if (file.solved) {
			return Promise.resolve(file);
		}
		if (this._active.has(file.key)) {
			return this._active.get(file.key);
		}
		// it is not solved and not in the active list so lets load it
		var promise = Promise.all([
			this.core.index.getIndex(),
			this.core.content.loadContent(file)
		]).spread((index: DefIndex, blob: DefBlob) => {
			// force empty for robustness
			file.dependencies.splice(0, file.dependencies.length);

			var queued: Promise<DefVersion>[] = this.applyResolution(index, file, blob.content.toString());
			// keep
			file.solved = true;
			return Promise.all(queued);
		}).finally(() => {
			// remove since it is ready
			this._active.delete(file.key);
		}).return(file);

		this._active.set(file.key, promise);

		return promise;
	}

	private applyResolution(index: DefIndex, file: DefVersion, content: string): Promise<DefVersion>[] {
		var refs: string[] = this.extractPaths(file, content);

		return refs.reduce((memo: any[], refPath: string) => {
			if (index.hasDef(refPath)) {
				// use .head (could use same commit but that would be version hell with interdependent definitions)
				var dep: Def = index.getDef(refPath);
				file.dependencies.push(dep);

				// TODO decide if always to go with head or not
				// maybe it need some resolving itself?
				if (!dep.head.solved && !this._active.has(dep.head.key)) {
					// console.log('recurse ' + dep.toString());

					// lets go deeper
					memo.push(this.resolveDeps(dep.head));
				}
			}
			else {
				console.log('path reference not in index: ' + refPath);
				// TODO weird: could be removed file; add it? beh?
			}
			return memo;
		}, []);
	}

	private extractPaths(file: DefVersion, content: string): string[] {
		// filter reasonable formed paths
		return defUtil.extractReferenceTags(content).reduce((memo: string[], refPath: string): any[] => {
			refPath = path.normalize(path.dirname(file.def.path) + '/' + refPath).replace(/\\/g, '/');

			if (Def.isDefPath(refPath) && memo.indexOf(refPath) < 0) {
				memo.push(refPath);
			}
			return memo;
		}, []);
	}
}

export = Resolver;
