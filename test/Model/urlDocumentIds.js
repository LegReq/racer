var expect = require('../util').expect;
var racer = require('../../lib/index');

describe('Document with url id\'s', function() {
  describe('create', function() {
    beforeEach(function() {
      this.backend = racer.createBackend();
      this.model = this.backend.createModel();
    });
    it('Scoped model using array path can create document without path input', function() {
      var collection ='report';
      var docId = 'https://example.com/' + this.model.id();
      var scopedModel = this.model.at([collection, docId]);
      var documentJson = {
        id: docId,
        name: 'example'
      };
      scopedModel.create(documentJson);
      var reportDoc = scopedModel.get();
      expect(reportDoc).to.equal(documentJson);
    });
    it('Creates document using array path input', function() {
      var collection ='report';
      var docId = 'https://example.com/' + this.model.id();
      var documentJson = {
        id: docId,
        name: 'example'
      };
      this.model.create([collection, docId], documentJson);
      var reportDoc = this.model.get([collection, docId]);
      expect(reportDoc).to.equal(documentJson);
    });
    it('Fails to create is scoped path a string', function() {
      var collection ='report';
      var docId = 'https://example.com/' + this.model.id();
      var scopedModel = this.model.at(collection + '.' + docId);
      var documentJson = {
        id: docId,
        name: 'example'
      };
      expect(function() {
        scopedModel.create(documentJson);
      }).to.throw();
    });
  });
  describe('get', function() {
    beforeEach(function() {
      this.backend = racer.createBackend();
      this.model = this.backend.createModel();
      var reportModel = this.model.at('report');
      this.docId = 'https://example.com/' + reportModel.id();
      this.document = {
        id: this.docId,
        name: 'example document'
      };
      reportModel.create([this.docId], this.document);
    });
    it('Gets document using array subpath', function() {
      var result = this.model.get(['report', this.docId]);
      expect(result).to.equal(this.document);
    });
    it('Fails to get document using string path', function() {
      var path = 'report.' + this.docId;
      var result = this.model.get(path);
      expect(result).to.equal(undefined);
    });
  });
  describe('set', function() {
    beforeEach(function() {
      this.backend = racer.createBackend();
      this.model = this.backend.createModel();
    });
    it('Sets document value if using subpath array', function() {
      var reportModel = this.model.at('report');
      var docId = 'https://example.com/' + reportModel.id();
      var document = {
        id: docId,
        name: 'example document'
      };
      reportModel.create([docId], document);

      var reportDoc = reportModel.get([docId]);
      reportDoc.name = 'updated document';
      reportModel.set([docId], reportDoc);
      var result = this.model.get(['report', docId]);
      expect(result).to.eql(reportDoc);
    });
    it('Fails to set document if using string subpath', function() {
      var model = this.model.at('_report');
      var docId = 'https://example.com/' + model.id();
      var document = {
        id: docId,
        name: 'example document'
      };
      model.set(docId, document);
      var result = model.get([docId]);
      expect(result).to.equal(undefined);
    });
  });
  describe('add', function() {
    beforeEach(function() {
      this.backend = racer.createBackend();
      this.model = this.backend.createModel();
    });
    it('adds document with url id', function() {
      var docId = 'https://example.com/' + this.model.id();
      var document = {
        id: docId,
        name: 'example'
      };
      var createdId = this.model.add('report', document);
      var doc = this.model.get(['report', createdId]);
      expect(doc).to.eql(document);
    });
  });
  describe('delete', function() {
    beforeEach(function() {
      this.backend = racer.createBackend();
      this.model = this.backend.createModel();
    });
    it('should delete document using array path', function() {
      var docId = 'https://example.com/' + this.model.id();
      var pathArray = ['report', docId];
      var document = {
        id: docId,
        name: 'example'
      };
      this.model.create(pathArray, document);
      var undeletedDoc = this.model.get(pathArray);
      expect(undeletedDoc).to.eql(document);
      this.model.del(pathArray);
      var deletedDoc = this.model.get(pathArray);
      expect(deletedDoc).to.equal(undefined);
    });
    it('should fail to delete document using string path', function() {
      var docId = 'https://example.com/' + this.model.id();
      var pathArray = ['report', docId];
      var path = 'report.' + docId;
      var document = {
        id: docId,
        name: 'example'
      };
      this.model.create(pathArray, document);
      var undeletedDoc = this.model.get(pathArray);
      expect(undeletedDoc).to.eql(document);
      this.model.del(path);
      var deletedDoc = this.model.get(pathArray);
      expect(deletedDoc).to.eql(document);
    });
  });
});
