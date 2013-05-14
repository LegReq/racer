var Model = require('./index');
var LocalDoc = require('./LocalDoc');
var RemoteDoc = require('./RemoteDoc');

Model.INITS.push(function(model) {
  model.collections = new CollectionMap;
});

Model.prototype.getCollection = function(collectionName) {
  return this.collections[collectionName];
};
Model.prototype.getDoc = function(collectionName, id) {
  var collection = this.collections[collectionName];
  return collection && collection.docs[id];
};
Model.prototype.get = function(subpath) {
  var segments = this._splitPath(subpath);
  return this._get(segments);
};
Model.prototype._get = function(segments) {
  segments = this._dereference(segments);
  var collectionName = segments[0];
  if (!collectionName) {
    return getEach(this.collections);
  }
  var id = segments[1];
  if (!id) {
    var collection = this.getCollection(collectionName);
    return collection && getEach(collection.docs);
  }
  var doc = this.getDoc(collectionName, id);
  return doc && doc.get(segments.slice(2));
};
Model.prototype.getOrCreateCollection = function(name) {
  var collection = this.collections[name];
  if (collection) return collection;
  // Whether the collection is local or remote is determined by its name.
  // Collections starting with an underscore ('_') are for user-defined local
  // collections, those starting with a dollar sign ('$'') are for
  // framework-defined local collections, and all others are remote.
  var firstCharcter = name.charAt(0);
  var isLocal = (firstCharcter === '_' || firstCharcter === '$');
  var Doc = (isLocal) ? LocalDoc : RemoteDoc;
  collection = new Collection(this, name, Doc);
  this.collections[name] = collection;
  return collection;
};
Model.prototype.getOrCreateDoc = function(collectionName, id, data) {
  var collection = this.getOrCreateCollection(collectionName);
  return collection.docs[id] || collection.add(id, data);
};

function CollectionMap() {}
function DocMap() {}
function Collection(model, name, Doc) {
  this.model = model;
  this.name = name;
  this.Doc = Doc;
  this.docs = new DocMap();
}
Collection.prototype.add = function(id, data) {
  var doc = new this.Doc(this.name, id, data, this.model);
  this.docs[id] = doc;
  return doc;
};
Collection.prototype.destroy = function() {
  delete this.model.collections[this.name];
};
Collection.prototype.remove = function(id) {
  delete this.docs[id];
  if (noKeys(this.docs)) this.destroy();
};
Collection.prototype.get = function() {
  return getEach(this.docs);
};

function getEach(object) {
  if (!object) return;
  var result = {};
  for (var key in object) {
    result[key] = object[key].get();
  }
  return result;
}

function noKeys(object) {
  for (var key in object) {
    return false;
  }
  return true;
}