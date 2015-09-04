//var mocha = require('mocha');
var expect = require('chai').expect;
var mocha = require('mocha');
//mocha.setup("BDD");


var circular = require('../lib/circularCache');

describe('circularCache', function() {
	describe("#addItem", function () {
		before(function() {
			circular.flush();
		});
		it('should have length 1', function() {
			circular.addItem("pp");
			expect(circular.getItems()).to.have.length(1);
		});
		it('should have length 10', function() {
			for (i=0; i < 20; i++ ) {
				circular.addItem({"limit": 1, "descending": true});
			}
			expect(circular.getItems()).to.have.length(10);
		});
	});
	describe('#getItems', function () {
		it("should get a specified object", function() {
			circular.flush();
			circular.addItem({"limit": 1, "descending": true});
			expect(circular.getItems()).to.deep.equal([{"limit": 1, "descending": true}]);
		})
	})
	describe('#flush', function() {
		it('should have length 0', function() {
			circular.flush();
			expect(circular.getItems()).to.have.length(0);
		});
	});
});
