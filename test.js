const {config} = require('./config');

/*
 * Ignore authentication for test purposes
 */
config.server.ignAuth = true;

const {checkJSDBIntegrity} = require('./core/commands/db');

const DB = require('./core/DB');
const Schema = require('./core/Schema');
const Sequence = require('./core/Sequence');
const Table = require('./core/Table');
const Registry = require('./core/Registry');
const User = require('./core/User');

const assert = require('assert');
const {describe, it, before, after} = require('mocha');

describe('DB', function () {
    describe('#create()', function () {
        it('Should return a DB instance', function () {
            assert.deepStrictEqual(DB.create('a'), new DB('a'));
        });
    });

    describe('#create()', function () {
        it('Should throw \'DB a already exists.\'', function () {
            assert.throws(() => {
                DB.create('a')
            });
        });
    });

    describe('#exists()', function () {
        it('Should return true', function () {
            assert.strictEqual(DB.exists('a'), true);
        });
    });

    describe('#drop()', function () {
        it('Should return true', function () {
            assert.strictEqual(new DB('a').drop(), true);
        });
    });

    describe('#exists()', function () {
        it('Should return false', function () {
            assert.strictEqual(DB.exists('a'), false);
        });
    });

    describe('#drop()', function () {
        it('Should throw \'Database a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').drop()
            });
        });
    });
});

describe('Schema', function () {
    before(function () {
        DB.create('a');
    });

    describe('#create()', function () {
        it('Should throw \'Schema a.public already.\'', function () {
            assert.throws(() => {
                Schema.create(new DB('a'), 'public')
            });
        });
    });

    describe('#create()', function () {
        it('Should return a Schema instance', function () {
            assert.deepStrictEqual(Schema.create(new DB('a'), 'a'), new DB('a').schema('a'));
        });
    });

    describe('#exists()', function () {
        it('Should return true', function () {
            assert.strictEqual(Schema.exists(new DB('a'), 'a'), true);
        });
    });

    describe('#dropShema()', function () {
        it('Should return true', function () {
            assert.strictEqual(new DB('a').schema('a').drop(), true);
        });
    });

    describe('#exists()', function () {
        it('Should return false', function () {
            assert.strictEqual(Schema.exists(new DB('a'), 'a'), false);
        });
    });

    describe('#drop()', function () {
        it('Should throw \'Schema a.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('a').drop()
            });
        });
    });

    after(function () {
        new DB('a').drop();
    });
});

describe('Sequence', function () {
    before(function () {
        DB.create('a');
    });

    describe('#create()', function () {
        it('Should return a Sequence Instance', function () {
            assert.deepStrictEqual(Sequence.create(new DB('a').schema('public'), 'a_seq'), new DB('a').schema('public').sequence('a_seq'));
        });
    });

    describe('#create()', function () {
        it('Should throw \'Sequence jsdb.public.a_seq already exists.\'', function () {
            assert.throws(() => {
                Sequence.create(new DB('a').schema('public'), 'a_seq')
            });
        });
    });

    describe('#exists()', function () {
        it('Should return true', function () {
            assert.strictEqual(Sequence.exists(new DB('a').schema('public'), 'a_seq'), true);
        });
    });

    describe('#read()', function () {
        it('Should return the sequence in a named array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').sequence('a_seq').read(), {
                start: 1,
                inc: 1,
            });
        });
    });

    describe('#update()', function () {
        it('Should return 1', function () {
            assert.strictEqual(new DB('a').schema('public').sequence('a_seq').update(
                {
                    start: 2,
                    inc: 1
                }), 1);
        });
    });

    describe('#read()', function () {
        it('Should return the sequence in a named array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').sequence('a_seq').read(), {
                start: 2,
                inc: 1
            });
        });
    });

    describe('#drop()', function () {
        it('Should return true', function () {
            assert.strictEqual(new DB('a').schema('public').sequence('a_seq').drop(), true);
        });
    });

    describe('#drop()', function () {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').drop()
            });
        });
    });

    describe('#read()', function () {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').read()
            });
        });
    });

    describe('#update()', function () {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').update(
                    {
                        start: 2,
                        inc: 1,
                    })
            });
        });
    });

    after(function () {
        new DB('a').drop();
    });
});

describe('Table', function () {
    before(function () {
        DB.create('a');
    });

    describe('#create()', function () {
        it('Should return a Table instance', function () {
            assert.deepStrictEqual(Table.create(new DB('a').schema('public'), 'a', {
                id: {
                    type: 'integer',
                    unique: true,
                    autoIncrement: true,
                    notNull: true
                }
            }), new DB('a').schema('public').table('a'));
        });
    });

    describe('#create()', function () {
        it('Should throw \'Table a.public.a already exists.\'', function () {
            assert.throws(() => {
                Table.create(new DB('a').schema('public'), 'a', {id: {type: 'integer'}});
            });
        });
    });

    describe('#exists()', function () {
        it('Should return true', function () {
            assert.strictEqual(Table.exists(new DB('a').schema('public'), 'a'), true);
        });
    });

    describe('#insert()', function () {
        it('Should return 1', function () {
            assert.strictEqual(new DB('a').schema('public').table('a').insert(['DEFAULT']), 1);
        });
    });

    describe('#insert()', function () {
        it('Should return 1', function () {
            assert.strictEqual(new DB('a').schema('public').table('a').insert(['DEFAULT']), 1);
        });
    });

    describe('#insert()', function () {
        it('Should throw \'Value already exists: 1\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert([1])
            });
        });
    });

    describe('#insert()', function () {
        it('Should throw \'`id` cannot be null\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert([null])
            });
        });
    });

    describe('#insert()', function () {
        it('Should throw \'Invalid type for column `id`: a(string)\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['a'])
            });
        });
    });

    describe('#insert()', function () {
        it('Should throw \'Invalid column: a\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['DEFAULT'], ['a'])
            });
        });
    });

    describe('#select()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), [{id: 1}, {id: 2}]);
        });
    });

    describe('#select()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {where: '`id` == 1'}), [{id: 1}]);
        });
    });

    describe('#select()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {
                orderBy: [{
                    column: 'id',
                    mode: 'DESC'
                }]
            }), [{id: 2}, {id: 1}]);
        });
    });

    describe('#update()', function () {
        it('Should return 2', function () {
            assert.strictEqual(new DB('a').schema('public').table('a').update({id: 'DEFAULT'}, {where: 'true'}), 2);
        });
    });

    describe('#select()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), [{id: 3}, {id: 4}]);
        });
    });

    describe('#delete()', function () {
        it('Should return 2', function () {
            assert.strictEqual(new DB('a').schema('public').table('a').delete({where: '`id` > 2'}), 2);
        });
    });

    describe('#select()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), []);
        });
    });

    describe('#drop()', function () {
        it('Should return true', function () {
            assert.strictEqual(new DB('a').schema('public').table('a').drop(), true);
        });
    });

    describe('#exists()', function () {
        it('Should return false', function () {
            assert.strictEqual(Table.exists(new DB('a').schema('public'), 'a'), false);
        });
    });

    describe('#drop()', function () {
        it('Should throw \'Table a.public.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').drop()
            });
        });
    });


    describe('#insert()', function () {
        it('Should throw \'Table a.public.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['DEFAULT'])
            });
        });
    });

    describe('#select()', function () {
        it('Should throw \'Table a.public.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').select(['*'], {})
            });
        });
    });

    describe('#update()', function () {
        it('Should throw \'Table a.public.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').update({id: 'DEFAULT'}, {where: 'true'})
            });
        });
    });

    describe('#delete()', function () {
        it('Should throw \'Table a.public.a does not exist.\'', function () {
            assert.throws(() => {
                new DB('a').schema('public').table('a').delete({where: 'true'})
            });
        });
    });

    after(function () {
        new DB('a').drop();
    });
});

describe('User', function () {
    let prev;

    before(function () {
        checkJSDBIntegrity();
        prev = new DB('jsdb').schema('public').sequence('users_id_seq').read();
    });

    describe('#create()', function () {
        it('Should return an User instance', function () {
            assert.deepStrictEqual(User.create('internaluser:test', 'jsdbadmin', {test: 15}), new User('internaluser:test'))
        });
    });

    describe('#create()', function () {
        it('Should throw \'User internaluser:test already exists.\'', function () {
            assert.throws(() => {
                User.create('internaluser:test', 'jsdbadmin', {test: 15})
            })
        });
    });

    describe('#auth()', function () {
        it('Should return true', function () {
            assert.strictEqual(User.auth('internaluser:test', 'jsdbadmin'), true)
        });
    });

    describe('#auth()', function () {
        it('Should return false', function () {
            assert.strictEqual(User.auth('internaluser:test', ''), false)
        });
    });

    describe('#getPrivileges()', function () {
        it('Should return the user privileges', function () {
            assert.deepStrictEqual(new User('internaluser:test').privileges(), {test: 15})
        });
    });

    describe('#update()', function () {
        it('Should return true', function () {
            assert.strictEqual(new User('internaluser:test').update({username: 'internaluser:test2'}), true);
        });
    });

    describe('#auth()', function () {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', function () {
            assert.throws(() => {
                User.auth('internaluser:test', 'jsdbadmin')
            });
        });
    });

    describe('#getPrivileges()', function () {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', function () {
            assert.throws(() => {
                new User('internaluser:test').privileges()
            })
        });
    });

    describe('#drop()', function () {
        it('Should return true', function () {
            assert.strictEqual(new User('internaluser:test2').drop(), true);
        });
    });

    after(function () {
        new DB('jsdb').schema('public').sequence('users_id_seq').update(prev);
    });
});

describe('Registry', function () {
    before(function () {
        checkJSDBIntegrity();
    });

    describe('#create()', function () {
        it('Should return a Registry Entry instance', function () {
            assert.deepStrictEqual(Registry.create('internalentry:test', 'number', 1), new Registry('internalentry:test'))
        });
    });

    describe('#create()', function () {
        it('Should throw \'Entry internalentry:test already exists\'', function () {
            assert.throws(() => {
                Registry.create('internalentry:test', 'number', 1)
            })
        });
    });

    describe('#read()', function () {
        it('Should return 1', function () {
            assert.strictEqual(new Registry('internalentry:test').read(), 1);
        });
    });

    describe('#exists()', function () {
        it('Should return true', function () {
            assert.strictEqual(Registry.exists('internalentry:test'), true);
        });
    });

    describe('#update()', function () {
        it('Should return 1', function () {
            assert.strictEqual(new Registry('internalentry:test').update(2), 1);
        });
    });

    describe('#update()', function () {
        it('Should throw \'Invalid type: string\'', function () {
            assert.throws(() => {
                new Registry('internalentry:test').update('1')
            });
        });
    });

    describe('#read()', function () {
        it('Should return 2', function () {
            assert.strictEqual(new Registry('internalentry:test').read(), 2);
        });
    });

    describe('#drop()', function () {
        it('Should return true', function () {
            assert.strictEqual(new Registry('internalentry:test').drop(), true);
        });
    });

    describe('#exists()', function () {
        it('Should return false', function () {
            assert.strictEqual(Registry.exists('internalentry:test'), false);
        });
    });
});