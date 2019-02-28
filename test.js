const config = require('./config');

/*
* Ignore authentication for test purposes
* */
config.server.ignAuth = true;

const db = require('./commands/db');
const schema = require('./commands/schema');
const sequence = require('./commands/sequence');
const table = require('./commands/table');
const user = require('./commands/user');
const registry = require('./commands/registry');

const assert = require('assert');

describe('DB', function () {
    describe('#createDB()', function () {
        it('Should return \'Created DB a.\'', function () {
            assert.strictEqual(db.create('a'), 'Created DB a.');
        });
    });

    describe('#createDB()', function () {
        it('Should throw \'DB a already exists.\'', function () {
            assert.throws(() => {
                db.create('a')
            });
        });
    });

    describe('#existsDB()', function () {
        it('Should return true', function () {
            assert.strictEqual(db.exists('a'), true);
        });
    });

    describe('#dropDB()', function () {
        it('Should return \'Dropped database a.\'', function () {
            assert.strictEqual(db.drop('a'), 'Dropped database a.');
        });
    });

    describe('#existsDB()', function () {
        it('Should throw \'Database a does not exist.\'', function () {
            assert.throws(() => {
                db.exists('a')
            });
        });
    });

    describe('#dropDB()', function () {
        it('Should throw \'Database a does not exist.\'', function () {
            assert.throws(() => {
                db.drop('a')
            });
        });
    });

    describe('#dropDB(ifExists)', function () {
        it('Should return \'Database a does not exist.', function () {
            assert.strictEqual(db.drop('a', true), 'Database a does not exist.');
        });
    });
});

describe('Schema', function () {
    before(function () {
        db.create('a');
    });

    describe('#creteSchema()', function () {
        it('Should throw \'Schema public already exists in DB a\'', function () {
            assert.throws(() => {
                schema.create('a', 'public')
            });
        });
    });

    describe('#creteSchema()', function () {
        it('Should return \'Created schema a\'', function () {
            assert.strictEqual(schema.create('a', 'a'), 'Created schema a in DB a.');
        });
    });

    describe('#existsSchema()', function () {
        it('Should return true', function () {
            assert.strictEqual(schema.exists('a', 'a'), true);
        });
    });

    describe('#dropShema()', function () {
        it('Should return \'Dropped Schema a.\'', function () {
            assert.strictEqual(schema.drop('a', 'a'), 'Dropped schema a.');
        });
    });

    describe('#existsSchema()', function () {
        it('Should throw \'Schema a does not exist.\'', function () {
            assert.throws(() => {
                schema.exists('a', 'a')
            });
        });
    });

    describe('#dropSchema()', function () {
        it('Should throw \'Schema a does not exist.\'', function () {
            assert.throws(() => {
                schema.drop('a', 'a')
            });
        });
    });

    describe('#dropSchema(ifExists)', function () {
        it('Should return \'Schema a does not exist.', function () {
            assert.strictEqual(schema.drop('a', 'a', true), 'Schema a does not exist.');
        });
    });

    after(function () {
        db.drop('a');
    });
});

describe('Sequence', function () {
    before(function () {
        db.create('a');
    });

    describe('#createSequence()', function () {
        it('Should return \'Created sequence public.a_seq in DB a.\'', function () {
            assert.strictEqual(sequence.create('a', 'public', 'a_seq'), 'Created sequence public.a_seq in DB a.');
        });
    });

    describe('#createSequence()', function () {
        it('Should throw \'Sequence public.a_seq already exists in DB a\'', function () {
            assert.throws(() => {
                sequence.create('a', 'public', 'a_seq')
            });
        });
    });

    describe('#existsSequence()', function () {
        it('Should return true', function () {
            assert.strictEqual(sequence.exists('a', 'public', 'a_seq'), true);
        });
    });

    describe('#readSequence()', function () {
        it('Should return the sequence in a named array', function () {
            assert.strictEqual(JSON.stringify(sequence.read('a', 'public', 'a_seq')), JSON.stringify({
                'start': 1,
                'inc': 1
            }));
        });
    });

    describe('#updateSequence()', function () {
        it('Should return \'Updated sequence a.\'', function () {
            assert.strictEqual(sequence.update('a', 'public', 'a_seq', {
                'start': 2,
                'inc': 1
            }), 'Updated sequence a_seq.');
        });
    });

    describe('#readSequence()', function () {
        it('Should return the sequence in a named array', function () {
            assert.strictEqual(JSON.stringify(sequence.read('a', 'public', 'a_seq')), JSON.stringify({
                'start': 2,
                'inc': 1
            }));
        });
    });

    describe('#dropSequence()', function () {
        it('Should return \'Deleted sequence public.a_seq.\'', function () {
            assert.strictEqual(sequence.drop('a', 'public', 'a_seq'), 'Deleted sequence public.a_seq.');
        });
    });

    describe('#dropSequence()', function () {
        it('Should throw \'Sequence public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                sequence.drop('a', 'public', 'a_seq')
            });
        });
    });

    describe('#dropSequence(ifExists)', function () {
        it('Should return \'Sequence public.a_seq does not exist.\'', function () {
            assert.strictEqual(sequence.drop('a', 'public', 'a_seq', true), 'Sequence public.a_seq does not exist.');
        });
    });

    describe('#readSequence()', function () {
        it('Should throw \'Sequence public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                sequence.read('a', 'public', 'a_seq')
            });
        });
    });

    describe('#updateSequence()', function () {
        it('Should throw \'Sequence public.a_seq does not exist.\'', function () {
            assert.throws(() => {
                sequence.update('a', 'public', 'a_seq', {'start': 2, 'inc': 1})
            });
        });
    });

    after(function () {
        db.drop('a');
    });
});

describe('Table', function () {
    before(function () {
        db.create('a');
    });

    describe('#createTable()', function () {
        it('Should return \'Created table public.a in DB a\'', function () {
            assert.strictEqual(table.create('a', 'public', 'a', {
                'id': {
                    'type': 'number',
                    'unique': true,
                    'autoIncrement': true,
                    'notNull': true
                }
            }), 'Created table public.a in DB a');
        });
    });

    describe('#createTable()', function () {
        it('Should throw \'Table public.a already exists in DB a\'', function () {
            assert.throws(() => {
                table.create('a', 'public', 'a', {'id': {'type': 'number'}});
            });
        });
    });

    describe('#existsTable()', function () {
        it('Should return true', function () {
            assert.strictEqual(table.exists('a', 'public', 'a'), true);
        });
    });

    describe('#insertTableContent()', function () {
        it('Should return \'Line inserted\'', function () {
            assert.strictEqual(table.insert('a', 'public', 'a', ['DEFAULT']), 'Line inserted.');
        });
    });

    describe('#insertTableContent()', function () {
        it('Should return \'Line inserted\'', function () {
            assert.strictEqual(table.insert('a', 'public', 'a', ['DEFAULT']), 'Line inserted.');
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Value already exists: 1\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', [1])
            });
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'`id` cannot be null\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', [null])
            });
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Invalid type for column `id`: a(string)\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', ['a'])
            });
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Invalid column : a\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', ['DEFAULT'], ['a'])
            });
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.strictEqual(JSON.stringify(table.select('a', 'public', 'a', ['*'], {})), JSON.stringify([{'id': 1}, {'id': 2}]));
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.strictEqual(JSON.stringify(table.select('a', 'public', 'a', ['*'], {'where': '`id` == 1'})), JSON.stringify([{'id': 1}]));
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.strictEqual(JSON.stringify(table.select('a', 'public', 'a', ['*'], {
                'orderby': [{
                    'column': 'id',
                    'mode': 'DESC'
                }]
            })), JSON.stringify([{'id': 2}, {'id': 1}]));
        });
    });

    describe('#updateTableContent()', function () {
        it('Should return \'Updated 2 line(s) from public:a.\'', function () {
            assert.strictEqual(table.update('a', 'public', 'a', {'id': 'DEFAULT'}, {'where': 'true'}), 'Updated 2 line(s) from public:a.');
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.strictEqual(JSON.stringify(table.select('a', 'public', 'a', ['*'], {})), JSON.stringify([{'id': 3}, {'id': 4}]));
        });
    });

    describe('#deleteTableContent()', function () {
        it('Should return \'Deleted 2 line(s) from public:a.\'', function () {
            assert.strictEqual(table.delete('a', 'public', 'a', {'where': '`id` > 2'}), 'Deleted 2 line(s) from public:a.');
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.strictEqual(JSON.stringify(table.select('a', 'public', 'a', ['*'], {})), JSON.stringify([]));
        });
    });

    describe('#dropTable()', function () {
        it('Should return \'Dropped table a.\'', function () {
            assert.strictEqual(table.drop('a', 'public', 'a'), 'Dropped table a.');
        });
    });

    describe('#dropTable()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.drop('a', 'public', 'a')
            });
        });
    });

    describe('#dropTable(ifExists)', function () {
        it('Should return \'Table public.a does not exist.\'', function () {
            assert.strictEqual(table.drop('a', 'public', 'a', true), 'Table public.a does not exist');
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', ['DEFAULT'])
            });
        });
    });

    describe('#selectTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.select('a', 'public', 'a', ['*'], {})
            });
        });
    });

    describe('#updateTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.update('a', 'public', 'a', {'id': 'DEFAULT'}, {'where': 'true'})
            });
        });
    });

    describe('#deleteTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.delete('a', 'public', 'a', {'where': 'true'})
            });
        });
    });

    after(function () {
        db.drop('a');
    });
});

describe('User', function () {
    let prev;

    before(function () {
        db.checkJSDBIntegrity();
        prev = sequence.read('jsdb', 'public', 'users_id_seq');
    });

    describe('#createUser()', function () {
        it('Should return \'Created user internaluser:test\'', function () {
            assert.strictEqual(user.create('internaluser:test', 'jsdbadmin', {'test': 15}), 'Created user internaluser:test')
        });
    });

    describe('#authUser()', function () {
        it('Should return true', function () {
            assert.strictEqual(JSON.stringify(user.auth('internaluser:test', 'jsdbadmin')), JSON.stringify(true))
        });
    });

    describe('#authUser()', function () {
        it('Should throw \'AUTHERR: Wrong password\'', function () {
            assert.throws(() => {
                user.auth('internaluser:test', '')
            })
        });
    });

    describe('#getUserPrivileges()', function () {
        it('Should return the user privileges', function () {
            assert.strictEqual(JSON.stringify(user.getPrivileges('internaluser:test')), JSON.stringify({'test': 15}))
        });
    });

    describe('#updateUser()', function () {
        it('Should return \'User internaluser:test updated\'', function () {
            assert.strictEqual(user.update('internaluser:test', {'username': 'internaluser:test2'}), 'User internaluser:test updated');
        });
    });

    describe('#authUser()', function () {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', function () {
            assert.throws(() => {
                user.auth('internaluser:test', 'jsdbadmin')
            });
        });
    });

    describe('#getUserPrivileges()', function () {
        it('Should throw \'AUTHERR: Invalid username: internaluser:test\'', function () {
            assert.throws(() => {
                user.getPrivileges('internaluser:test')
            })
        });
    });

    describe('#dropUser()', function () {
        it('Should return \'User internaluser:test2 deleted\'', function () {
            assert.strictEqual(user.drop('internaluser:test2'), 'User internaluser:test2 deleted');
        });
    });

    after(function () {
        sequence.update('jsdb', 'public', 'users_id_seq', prev);
    });
});

describe('Registry', function () {
    before(function () {
        db.checkJSDBIntegrity();
    });

    describe('#createEntry()', function () {
        it('Should return \'Created entry internalentry:test\'', function () {
            assert.strictEqual(registry.create('internalentry:test', 'number', 1), 'Created entry internalentry:test')
        });
    });

    describe('#createEntry()', function () {
        it('Should throw \'Entry internalentry:test already exists\'', function () {
            assert.throws(() => {
                registry.create('internalentry:test', 'number', 1)
            })
        });
    });

    describe('#readEntry()', function () {
        it('Should return 1', function () {
            assert.strictEqual(registry.read('internalentry:test'), 1);
        });
    });

    describe('#existsEntry()', function () {
        it('Should return true', function () {
            assert.strictEqual(registry.exists('internalentry:test'), true);
        });
    });

    describe('#updateEntry()', function () {
        it('Should return \'Updated entry internalentry:test\'', function () {
            assert.strictEqual(registry.update('internalentry:test', 2), 'Updated entry internalentry:test');
        });
    });

    describe('#updateEntry()', function () {
        it('Should throw \'Invalid type\'', function () {
            assert.throws(() => {
                registry.update('internalentry:test', '1')
            });
        });
    });

    describe('#readEntry()', function () {
        it('Should return 2', function () {
            assert.strictEqual(registry.read('internalentry:test'), 2);
        });
    });

    describe('#deleteEntry()', function () {
        it('Should return \'Deleted entry internalentry:test\'', function () {
            assert.strictEqual(registry.delete('internalentry:test'), 'Deleted entry internalentry:test');
        });
    });

    describe('#existsEntry()', function () {
        it('Should throw \'Entry internalentry:test does not exist\'', function () {
            assert.throws(() => {
                registry.exists('internalentry:test')
            });
        });
    });
});