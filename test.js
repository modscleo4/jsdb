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

describe('DB', () => {
    describe('#create()', () => {
        it('Should return a DB instance', () => {
            assert.deepStrictEqual(DB.create('a'), new DB('a'));
        });
    });

    describe('#create()', () => {
        it('Should throw \'DB a already exists.\'', () => {
            assert.throws(() => {
                DB.create('a')
            });
        });
    });

    describe('#exists()', () => {
        it('Should return true', () => {
            assert.strictEqual(DB.exists('a'), true);
        });
    });

    describe('#drop()', () => {
        it('Should return true', () => {
            assert.strictEqual(new DB('a').drop(), true);
        });
    });

    describe('#exists()', () => {
        it('Should return false', () => {
            assert.strictEqual(DB.exists('a'), false);
        });
    });

    describe('#drop()', () => {
        it('Should throw \'Database a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').drop()
            });
        });
    });
});

describe('Schema', () => {
    before(() => {
        DB.create('a');
    });

    describe('#create()', () => {
        it('Should throw \'Schema a.public already.\'', () => {
            assert.throws(() => {
                Schema.create(new DB('a'), 'public')
            });
        });
    });

    describe('#create()', () => {
        it('Should return a Schema instance', () => {
            assert.deepStrictEqual(Schema.create(new DB('a'), 'a'), new DB('a').schema('a'));
        });
    });

    describe('#exists()', () => {
        it('Should return true', () => {
            assert.strictEqual(Schema.exists(new DB('a'), 'a'), true);
        });
    });

    describe('#dropShema()', () => {
        it('Should return true', () => {
            assert.strictEqual(new DB('a').schema('a').drop(), true);
        });
    });

    describe('#exists()', () => {
        it('Should return false', () => {
            assert.strictEqual(Schema.exists(new DB('a'), 'a'), false);
        });
    });

    describe('#drop()', () => {
        it('Should throw \'Schema a.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('a').drop()
            });
        });
    });

    after(() => {
        new DB('a').drop();
    });
});

describe('Sequence', () => {
    before(() => {
        DB.create('a');
    });

    describe('#create()', () => {
        it('Should return a Sequence Instance', () => {
            assert.deepStrictEqual(Sequence.create(new DB('a').schema('public'), 'a_seq'), new DB('a').schema('public').sequence('a_seq'));
        });
    });

    describe('#create()', () => {
        it('Should throw \'Sequence jsdb.public.a_seq already exists.\'', () => {
            assert.throws(() => {
                Sequence.create(new DB('a').schema('public'), 'a_seq')
            });
        });
    });

    describe('#exists()', () => {
        it('Should return true', () => {
            assert.strictEqual(Sequence.exists(new DB('a').schema('public'), 'a_seq'), true);
        });
    });

    describe('#read()', () => {
        it('Should return the sequence in a named array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').sequence('a_seq').read(), {
                start: 1,
                inc: 1,
            });
        });
    });

    describe('#update()', () => {
        it('Should return 1', () => {
            assert.strictEqual(new DB('a').schema('public').sequence('a_seq').update(
                {
                    start: 2,
                    inc: 1
                }), 1);
        });
    });

    describe('#read()', () => {
        it('Should return the sequence in a named array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').sequence('a_seq').read(), {
                start: 2,
                inc: 1
            });
        });
    });

    describe('#drop()', () => {
        it('Should return true', () => {
            assert.strictEqual(new DB('a').schema('public').sequence('a_seq').drop(), true);
        });
    });

    describe('#drop()', () => {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').drop()
            });
        });
    });

    describe('#read()', () => {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').read()
            });
        });
    });

    describe('#update()', () => {
        it('Should throw \'Sequence jsdb.public.a_seq does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').sequence('a_seq').update(
                    {
                        start: 2,
                        inc: 1,
                    })
            });
        });
    });

    after(() => {
        new DB('a').drop();
    });
});

describe('Table', () => {
    before(() => {
        DB.create('a');
    });

    describe('#create()', () => {
        it('Should return a Table instance', () => {
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

    describe('#create()', () => {
        it('Should throw \'Table a.public.a already exists.\'', () => {
            assert.throws(() => {
                Table.create(new DB('a').schema('public'), 'a', {id: {type: 'integer'}});
            });
        });
    });

    describe('#exists()', () => {
        it('Should return true', () => {
            assert.strictEqual(Table.exists(new DB('a').schema('public'), 'a'), true);
        });
    });

    describe('#insert()', () => {
        it('Should return 1', () => {
            assert.strictEqual(new DB('a').schema('public').table('a').insert(['DEFAULT']), 1);
        });
    });

    describe('#insert()', () => {
        it('Should return 1', () => {
            assert.strictEqual(new DB('a').schema('public').table('a').insert(['DEFAULT']), 1);
        });
    });

    describe('#insert()', () => {
        it('Should throw \'Value already exists: 1\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert([1])
            });
        });
    });

    describe('#insert()', () => {
        it('Should throw \'`id` cannot be null\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert([null])
            });
        });
    });

    describe('#insert()', () => {
        it('Should throw \'Invalid type for column `id`: a(string)\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['a'])
            });
        });
    });

    describe('#insert()', () => {
        it('Should throw \'Invalid column: a\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['DEFAULT'], ['a'])
            });
        });
    });

    describe('#select()', () => {
        it('Should return the table data in a indexed array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), [{id: 1}, {id: 2}]);
        });
    });

    describe('#select()', () => {
        it('Should return the table data in a indexed array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {where: '`id` == 1'}), [{id: 1}]);
        });
    });

    describe('#select()', () => {
        it('Should return the table data in a indexed array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {
                orderBy: [{
                    column: 'id',
                    mode: 'DESC'
                }]
            }), [{id: 2}, {id: 1}]);
        });
    });

    describe('#update()', () => {
        it('Should return 2', () => {
            assert.strictEqual(new DB('a').schema('public').table('a').update({id: 'DEFAULT'}, {where: 'true'}), 2);
        });
    });

    describe('#select()', () => {
        it('Should return the table data in a indexed array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), [{id: 3}, {id: 4}]);
        });
    });

    describe('#delete()', () => {
        it('Should return 2', () => {
            assert.strictEqual(new DB('a').schema('public').table('a').delete({where: '`id` > 2'}), 2);
        });
    });

    describe('#select()', () => {
        it('Should return the table data in a indexed array', () => {
            assert.deepStrictEqual(new DB('a').schema('public').table('a').select(['*'], {}), []);
        });
    });

    describe('#drop()', () => {
        it('Should return true', () => {
            assert.strictEqual(new DB('a').schema('public').table('a').drop(), true);
        });
    });

    describe('#exists()', () => {
        it('Should return false', () => {
            assert.strictEqual(Table.exists(new DB('a').schema('public'), 'a'), false);
        });
    });

    describe('#drop()', () => {
        it('Should throw \'Table a.public.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').drop()
            });
        });
    });


    describe('#insert()', () => {
        it('Should throw \'Table a.public.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').insert(['DEFAULT'])
            });
        });
    });

    describe('#select()', () => {
        it('Should throw \'Table a.public.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').select(['*'], {})
            });
        });
    });

    describe('#update()', () => {
        it('Should throw \'Table a.public.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').update({id: 'DEFAULT'}, {where: 'true'})
            });
        });
    });

    describe('#delete()', () => {
        it('Should throw \'Table a.public.a does not exist.\'', () => {
            assert.throws(() => {
                new DB('a').schema('public').table('a').delete({where: 'true'})
            });
        });
    });

    after(() => {
        new DB('a').drop();
    });
});

describe('User', () => {
    let prev;

    before(() => {
        checkJSDBIntegrity();
        prev = new DB('jsdb').schema('public').sequence('users_id_seq').read();
    });

    describe('#create()', () => {
        it('Should return an User instance', () => {
            assert.deepStrictEqual(User.create('internaluser:test', 'jsdbadmin', {test: 15}), new User('internaluser:test'))
        });
    });

    describe('#create()', () => {
        it('Should throw \'User internaluser:test already exists.\'', () => {
            assert.throws(() => {
                User.create('internaluser:test', 'jsdbadmin', {test: 15})
            })
        });
    });

    describe('#auth()', () => {
        it('Should return true', () => {
            assert.strictEqual(User.auth('internaluser:test', 'jsdbadmin'), true)
        });
    });

    describe('#auth()', () => {
        it('Should return false', () => {
            assert.strictEqual(User.auth('internaluser:test', ''), false)
        });
    });

    describe('#getPrivileges()', () => {
        it('Should return the user privileges', () => {
            assert.deepStrictEqual(new User('internaluser:test').privileges(), {test: 15})
        });
    });

    describe('#update()', () => {
        it('Should return true', () => {
            assert.strictEqual(new User('internaluser:test').update({username: 'internaluser:test2'}), true);
        });
    });

    describe('#auth()', () => {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', () => {
            assert.throws(() => {
                User.auth('internaluser:test', 'jsdbadmin')
            });
        });
    });

    describe('#getPrivileges()', () => {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', () => {
            assert.throws(() => {
                new User('internaluser:test').privileges()
            })
        });
    });

    describe('#drop()', () => {
        it('Should return true', () => {
            assert.strictEqual(new User('internaluser:test2').drop(), true);
        });
    });

    after(() => {
        new DB('jsdb').schema('public').sequence('users_id_seq').update(prev);
    });
});

describe('Registry', () => {
    before(() => {
        checkJSDBIntegrity();
    });

    describe('#create()', () => {
        it('Should return a Registry Entry instance', () => {
            assert.deepStrictEqual(Registry.create('internalentry:test', 'number', 1), new Registry('internalentry:test'))
        });
    });

    describe('#create()', () => {
        it('Should throw \'Entry internalentry:test already exists\'', () => {
            assert.throws(() => {
                Registry.create('internalentry:test', 'number', 1)
            })
        });
    });

    describe('#read()', () => {
        it('Should return 1', () => {
            assert.strictEqual(new Registry('internalentry:test').read(), 1);
        });
    });

    describe('#exists()', () => {
        it('Should return true', () => {
            assert.strictEqual(Registry.exists('internalentry:test'), true);
        });
    });

    describe('#update()', () => {
        it('Should return 1', () => {
            assert.strictEqual(new Registry('internalentry:test').update(2), 1);
        });
    });

    describe('#update()', () => {
        it('Should throw \'Invalid type: string\'', () => {
            assert.throws(() => {
                new Registry('internalentry:test').update('1')
            });
        });
    });

    describe('#read()', () => {
        it('Should return 2', () => {
            assert.strictEqual(new Registry('internalentry:test').read(), 2);
        });
    });

    describe('#drop()', () => {
        it('Should return true', () => {
            assert.strictEqual(new Registry('internalentry:test').drop(), true);
        });
    });

    describe('#exists()', () => {
        it('Should return false', () => {
            assert.strictEqual(Registry.exists('internalentry:test'), false);
        });
    });
});