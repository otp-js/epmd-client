/**
 * Decoder tests
 */
'use strict';

let mocha = require('mocha');
let describe = mocha.describe;
let it = mocha.it;
let chai = require('chai');
let expect = chai.expect;
let should = chai.should();

let decoder = require('../protocol/decoder');
let constants = require('../protocol/constants');

function createAliveResp(responseCode) {
    let buf = Buffer.alloc(4);
    buf.writeUInt8(constants.ALIVE_RESP, 0);
    buf.writeUInt8(responseCode, 1);
    buf.writeUInt16BE(1, 2);
    return buf;
}

function createPort2Resp(
    responseCode,
    nodeName,
    port,
    highestVersion,
    lowestVersion
) {
    let nodeLength = Buffer.byteLength(nodeName);
    let buf = Buffer.alloc(14 + nodeLength);
    let offset = 0;
    buf.writeUInt8(constants.PORT2_RESP, offset);
    offset += 1;
    buf.writeUInt8(responseCode, offset);
    offset += 1;
    buf.writeUInt16BE(port, offset);
    offset += 2;
    buf.writeUInt8(constants.NODE_TYPE_NORMAL, offset);
    offset += 1;
    buf.writeUInt8(constants.PROTOCOL_IPV4, offset);
    offset += 1;
    buf.writeUInt16BE(highestVersion, offset);
    offset += 2;
    buf.writeUInt16BE(lowestVersion, offset);
    offset += 2;
    buf.writeUInt16BE(nodeLength, offset);
    offset += 2;
    buf.write(nodeName, offset);
    offset += nodeLength;
    buf.writeUInt16BE(0, offset);
    return buf;
}

function createNamesOrDumpResp(nodes) {
    return Buffer.from(nodes.join('\n'), 'utf8');
}

describe('decoder', function () {
    describe('#decode()', function () {
        describe('ALIVE_RESP', function () {
            it('should decode a non-error response', function () {
                let buf = createAliveResp(0);

                let actual = decoder.decode(buf);
                actual.code.should.equal(constants.ALIVE_RESP);
                actual.data.creation.equals(buf.slice(2)).should.equal(true);
            });

            it('should throw a DecoderError with a error response', function () {
                let buf = createAliveResp(1);

                expect(function () {
                    decoder.decode(buf);
                }).to.throw();
            });
        });

        describe('PORT2_RESP', function () {
            it('should decode a non-error response', function () {
                let port = 1337;
                let nodeName = 'testing';
                let buf = createPort2Resp(
                    0,
                    nodeName,
                    port,
                    constants.HIGHEST_VERSION,
                    constants.LOWEST_VERSION
                );

                let actual = decoder.decode(buf);
                actual.code.should.equal(constants.PORT2_RESP);
                actual.data.nodeType.should.equal(constants.NODE_TYPE_NORMAL);
                actual.data.protocol.should.equal(constants.PROTOCOL_IPV4);
                actual.data.port.should.equal(port);
                actual.data.name.should.equal(nodeName);
                actual.data.extra.equals(Buffer.alloc(0)).should.equal(true);
            });

            it('should throw a DecoderError with an error response', function () {
                let port = 1337;
                let nodeName = 'testing';
                let buf = createPort2Resp(
                    1,
                    nodeName,
                    port,
                    constants.HIGHEST_VERSION,
                    constants.LOWEST_VERSION
                );

                expect(function () {
                    decoder.decode(buf);
                }).to.throw();
            });

            it('should throw a DecoderError if highestVersion < LOWEST_VERSION', function () {
                let port = 1337;
                let nodeName = 'testing';
                let buf = createPort2Resp(
                    0,
                    nodeName,
                    port,
                    0,
                    constants.LOWEST_VERSION
                );

                expect(function () {
                    decoder.decode(buf);
                }).to.throw();
            });

            it('should throw a DecoderError if lowestVersion > HIGHEST_VERSION', function () {
                let port = 1337;
                let nodeName = 'testing';
                let buf = createPort2Resp(
                    0,
                    nodeName,
                    port,
                    constants.HIGHEST_VERSION,
                    10
                );

                expect(function () {
                    decoder.decode(buf);
                }).to.throw();
            });
        });

        describe('NAMES_RESP', function () {
            it('should decode a NAMES_RESP message with a single node', function () {
                let nodes = ['name test at port 342'];
                let buf = createNamesOrDumpResp(nodes);

                let actual = decoder.decode(buf);
                actual.length.should.equal(1);
                actual[0].name.should.equal('test');
                actual[0].port.should.equal(342);
                should.not.exist(actual[0].fd);
            });

            it('should decode a NAMES_RESP message with three nodes', function () {
                let nodes = [
                    'name test at port 342',
                    'name llool at port 456',
                    'name hehehe at port 596',
                ];
                let buf = createNamesOrDumpResp(nodes);

                let actual = decoder.decode(buf);
                actual.length.should.equal(3);

                actual[0].name.should.equal('test');
                actual[0].port.should.equal(342);
                should.not.exist(actual[0].fd);

                actual[1].name.should.equal('llool');
                actual[1].port.should.equal(456);
                should.not.exist(actual[1].fd);

                actual[2].name.should.equal('hehehe');
                actual[2].port.should.equal(596);
                should.not.exist(actual[2].fd);
            });

            it('should not decode a empty/wrong NAMES_RESP message', function () {
                let nodes = [' '];
                let buf = createNamesOrDumpResp(nodes);

                let actual = decoder.decode(buf);
                actual.length.should.equal(0);
            });
        });

        describe('DUMP_RESP', function () {
            it('should decode a DUMP_RESP message with a single node', function () {
                let nodes = ['name test at port 342, fd = 5'];
                let buf = createNamesOrDumpResp(nodes);

                let actual = decoder.decode(buf);
                actual.length.should.equal(1);
                actual[0].name.should.equal('test');
                actual[0].port.should.equal(342);
                actual[0].fd.should.equal(5);
            });

            it('should decode a DUMP_RESP message with three nodes', function () {
                let nodes = [
                    'name test at port 342, fd = 5',
                    'name llool at port 456, fd = 6',
                    'name hehehe at port 596, fd = 17',
                ];
                let buf = createNamesOrDumpResp(nodes);

                let actual = decoder.decode(buf);
                actual.length.should.equal(3);

                actual[0].name.should.equal('test');
                actual[0].port.should.equal(342);
                actual[0].fd.should.equal(5);

                actual[1].name.should.equal('llool');
                actual[1].port.should.equal(456);
                actual[1].fd.should.equal(6);

                actual[2].name.should.equal('hehehe');
                actual[2].port.should.equal(596);
                actual[2].fd.should.equal(17);
            });
        });
    });
});
