/**
 * EPMD protocol encoder
 *
 * @see http://www.erlang.org/doc/apps/erts/erl_dist_protocol.html
 */
'use strict';

let constants = require('./constants');

/**
 * Each request should be preceeded by a two-byte length field.
 *
 * +------+-------+
 * |2     |n      |
 * +--------------+
 * |Length|Request|
 * +------+-------+
 *
 * @param {Buffer} req
 * @returns {Buffer}
 */
function requestWrapper(req) {
    let baseLength = 2;
    let buf = Buffer.alloc(baseLength + req.length);
    buf.writeUInt16BE(req.length, 0);
    req.copy(buf, 2, 0);

    return buf;
}

/**
 * ALIVE_REQ registers a node on EPMD
 *
 * +---+------+--------+--------+--------------+-------------+----+--------+----+-----+
 * |1  |2     |1       |1       |2             |2            |2   |Nlen    |2   |Elen |
 * +----------------------------------------------------------------------------------+
 * |120|PortNo|NodeType|Protocol|HighestVersion|LowestVersion|Nlen|NodeName|Elen|Extra|
 * +---+------+--------+--------+--------------+-------------+----+--------+----+-----+
 *
 *
 * @param {int} port
 * @param {string} nodeName
 * @returns {Buffer}
 */
function alive2Request(port, nodeName) {
    const nodeLength = Buffer.byteLength(nodeName, 'utf8');
    const extra = Buffer.alloc(0);
    const length = 1 + 2 + 1 + 1 + 2 + 2 + 2 + nodeLength + 2 + extra.length;
    const buff = Buffer.alloc(length);

    buff.writeUInt8(constants.ALIVE2_REQ, 0);
    buff.writeUInt16BE(port, 1);
    buff.writeUInt8(constants.NODE_TYPE_NORMAL, 3);
    buff.writeUInt8(constants.PROTOCOL_IPV4, 4);
    buff.writeUInt16BE(6, 5);
    buff.writeUInt16BE(5, 7);
    buff.writeUInt16BE(nodeLength, 9);
    buff.write(nodeName, 11, 'utf8');
    buff.writeUInt16BE(extra.length, 11 + nodeLength);
    buff.set(extra, 13 + nodeLength);

    return buff;
}

/**
 * Request for host/port combination for a node name.
 *
 * +---+--------+
 * | 1 |   N    |
 * +------------+
 * |122|NodeName|
 * +---+--------+
 * Where N = NodeNameLength - 1
 *
 * @param {string} nodeName
 * @returns {Buffer}
 */
function portPleaseRequest(nodeName) {
    let baseLength = 2;
    let nameLength = Buffer.byteLength(nodeName, 'utf8') - 1;
    let req = Buffer.alloc(baseLength + nameLength);
    let offset = 0;
    req.writeUInt8(constants.PORT_PLEASE2_REQ, offset);
    offset = 1;
    req.write(nodeName, offset);
    return req;
}

/**
 * Request for all names in an EPMD node.
 *
 * +---+
 * | 1 |
 * +----
 * |110|
 * +---+
 *
 * @returns {Buffer}
 */
function namesRequest() {
    let req = Buffer.alloc(1);
    req.writeUInt8(constants.NAMES_REQ, 0);
    return req;
}

/**
 * Request for dumping all EPMD data.
 *
 * +---+
 * | 1 |
 * +----
 * |100|
 * +---+
 *
 * @returns {Buffer}
 */
function dumpRequest() {
    let req = Buffer.alloc(1);
    req.writeUInt8(constants.DUMP_REQ, 0);
    return req;
}

/**
 * This request kills EPMD.
 *
 * +---+
 * | 1 |
 * +----
 * |107|
 * +---+
 *
 * @returns {Buffer}
 */
function killRequest() {
    let req = Buffer.alloc(1);
    req.writeUInt8(constants.KILL_REQ, 0);
    return req;
}

module.exports = {
    requestWrapper: requestWrapper,
    alive2Request: alive2Request,
    portPleaseRequest: portPleaseRequest,
    namesRequest: namesRequest,
    dumpRequest: dumpRequest,
    killRequest: killRequest,
};
