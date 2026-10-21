import assert from 'node:assert/strict';
import {hasOnlyFileDriveScope,matchesSelectedFolders,DRIVE_FILE_SCOPE} from '../app/drive-scope.ts';
assert(hasOnlyFileDriveScope('openid email '+DRIVE_FILE_SCOPE));
for(const value of ['', 'https://www.googleapis.com/auth/drive',DRIVE_FILE_SCOPE+' https://www.googleapis.com/auth/drive',DRIVE_FILE_SCOPE+' https://www.googleapis.com/auth/drive.readonly'])assert.equal(hasOnlyFileDriveScope(value),false);
assert(matchesSelectedFolders(['b','a'],['a','b']));assert(!matchesSelectedFolders(['a','a'],['a','b']));assert(!matchesSelectedFolders(['a','b','outside'],['a','b']));
console.log('PASS: only drive.file accepted; broad scopes and extra/duplicate folders rejected');
