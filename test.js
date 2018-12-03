const config = require('./config');

/*
* Ignore authentication for test purposes
* */
config.ignAuth = true;

const db = require("./commands/db");
const schema = require("./commands/schema");
const sequence = require("./commands/sequence");
const table = require("./commands/table");
const user = require('./commands/user');
const sql = require("./sql/sql");

const md5 = require('md5');

const assert = require('assert');

describe('DB', function () {
    describe('#createDB()', function () {
        it('Should return \'Created DB a.\'', function () {
            assert.equal(db.create('a'), 'Created DB a.');
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
            assert.equal(db.exists('a'), true);
        });
    });

    describe('#dropDB()', function () {
        it('Should return \'Dropped database a.\'', function () {
            assert.equal(db.drop('a'), 'Dropped database a.');
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
            assert.equal(db.drop('a', true), 'Database a does not exist.');
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
            assert.equal(schema.create('a', 'a'), 'Created schema a in DB a.');
        });
    });

    describe('#existsSchema()', function () {
        it('Should return true', function () {
            assert.equal(schema.exists('a', 'a'), true);
        });
    });

    describe('#dropShema()', function () {
        it('Should return \'Dropped Schema a.\'', function () {
            assert.equal(schema.drop('a', 'a'), 'Dropped schema a.');
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
            assert.equal(schema.drop('a', 'a', true), 'Schema a does not exist.');
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
            assert.equal(sequence.create('a', 'public', 'a_seq'), 'Created sequence public.a_seq in DB a.');
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
            assert.equal(sequence.exists('a', 'public', 'a_seq'), true);
        });
    });

    describe('#readSequence()', function () {
        it('Should return the sequence in a named array', function () {
            assert.equal(JSON.stringify(sequence.read('a', 'public', 'a_seq')), JSON.stringify({"start": 1, "inc": 1}));
        });
    });

    describe('#updateSequence()', function () {
        it('Should return \'Updated sequence a.\'', function () {
            assert.equal(sequence.update('a', 'public', 'a_seq', {"start": 2, "inc": 1}), 'Updated sequence a_seq.');
        });
    });

    describe('#readSequence()', function () {
        it('Should return the sequence in a named array', function () {
            assert.equal(JSON.stringify(sequence.read('a', 'public', 'a_seq')), JSON.stringify({"start": 2, "inc": 1}));
        });
    });

    describe('#dropSequence()', function () {
        it('Should return \'Deleted sequence public.a_seq.\'', function () {
            assert.equal(sequence.drop('a', 'public', 'a_seq'), 'Deleted sequence public.a_seq.');
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
            assert.equal(sequence.drop('a', 'public', 'a_seq', true), 'Sequence public.a_seq does not exist.');
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
                sequence.update('a', 'public', 'a_seq', {"start": 2, "inc": 1})
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
            assert.equal(table.create('a', 'public', 'a', {
                "id": {
                    "type": "number",
                    "unique": true,
                    "autoIncrement": true,
                    "notNull": true
                }
            }), 'Created table public.a in DB a');
        });
    });

    describe('#createTable()', function () {
        it('Should throw \'Table public.a already exists in DB a\'', function () {
            assert.throws(() => {
                table.create('a', 'public', 'a', {"id": {"type": "number"}});
            });
        });
    });

    describe('#existsTable()', function () {
        it('Should return true', function () {
            assert.equal(table.exists('a', 'public', 'a'), true);
        });
    });

    describe('#insertTableContent()', function () {
        it('Should return \'Line inserted\'', function () {
            assert.equal(table.insert('a', 'public', 'a', ["DEFAULT"]), 'Line inserted.');
        });
    });

    describe('#insertTableContent()', function () {
        it('Should return \'Line inserted\'', function () {
            assert.equal(table.insert('a', 'public', 'a', ["DEFAULT"]), 'Line inserted.');
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
                table.insert('a', 'public', 'a', ["a"])
            });
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Invalid column : a\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', ["DEFAULT"], ["a"])
            });
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.equal(JSON.stringify(table.select('a', 'public', 'a', ["*"], {})), JSON.stringify([{"id": 1}, {"id": 2}]));
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.equal(JSON.stringify(table.select('a', 'public', 'a', ["*"], {"where": "`id` == 1"})), JSON.stringify([{"id": 1}]));
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.equal(JSON.stringify(table.select('a', 'public', 'a', ["*"], {
                "orderby": [{
                    "column": "id",
                    "mode": "DESC"
                }]
            })), JSON.stringify([{"id": 2}, {"id": 1}]));
        });
    });

    describe('#updateTableContent()', function () {
        it('Should return \'Updated 2 line(s) from public:a.\'', function () {
            assert.equal(table.update('a', 'public', 'a', {"id": "DEFAULT"}, {"where": "true"}), 'Updated 2 line(s) from public:a.');
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.equal(JSON.stringify(table.select('a', 'public', 'a', ["*"], {})), JSON.stringify([{"id": 3}, {"id": 4}]));
        });
    });

    describe('#deleteTableContent()', function () {
        it('Should return \'Deleted 2 line(s) from public:a.\'', function () {
            assert.equal(table.delete('a', 'public', 'a', {"where": "`id` > 2"}), 'Deleted 2 line(s) from public:a.');
        });
    });

    describe('#selectTableContent()', function () {
        it('Should return the table data in a indexed array', function () {
            assert.equal(JSON.stringify(table.select('a', 'public', 'a', ["*"], {})), JSON.stringify([]));
        });
    });

    describe('#dropTable()', function () {
        it('Should return \'Dropped table a.\'', function () {
            assert.equal(table.drop('a', 'public', 'a'), 'Dropped table a.');
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
            assert.equal(table.drop('a', 'public', 'a', true), 'Table public.a does not exist');
        });
    });

    describe('#insertTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.insert('a', 'public', 'a', ["DEFAULT"])
            });
        });
    });

    describe('#selectTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.select('a', 'public', 'a', ["*"], {})
            });
        });
    });

    describe('#updateTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.update('a', 'public', 'a', {"id": "DEFAULT"}, {"where": "true"})
            });
        });
    });

    describe('#deleteTableContent()', function () {
        it('Should throw \'Table public.a does not exist.\'', function () {
            assert.throws(() => {
                table.delete('a', 'public', 'a', {"where": "true"})
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
        let passwd = 'jsdbadmin';
        prev = sequence.read('jsdb', 'public', 'users_id_seq');
        table.insert('jsdb', 'public', 'users', ["DEFAULT", 'internaluser:test', md5(`${passwd}`), "DEFAULT", JSON.stringify({"create": true})]);
    });

    describe('#authUser()', function () {
        it('Should return the user privileges', function () {
            assert.equal(JSON.stringify(user.auth('internaluser:test', 'jsdbadmin')), JSON.stringify({"create": true}))
        });
    });

    after(function () {
        table.delete('jsdb', 'public', 'users', {"where": '`username` == \'internaluser:test\''});
        sequence.update('jsdb', 'public', 'users_id_seq', prev);
    });
});