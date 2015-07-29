/**
 * MOST Web Framework
 * A JavaScript Web Framework
 * http://themost.io
 *
 * Copyright (c) 2015, Kyriakos Barbounakis k.barbounakis@gmail.com, Anthi Oikonomou anthioikonomou@gmail.com
 *
 * Released under the BSD 3-Clause license
 * Date: 2015-07-29
 *
 * JQuery Extension for MOST Web Framework ver. 0.1.2
 *
 */
(function(window) {'use strict';

    if (typeof window.jQuery === 'undefined') { return; }
    if (typeof $ === 'undefined') { $ = window.jQuery; }

    /**
     * @class MostClient
     * @param {string=} url
     * @constructor
     */
    function MostClient(url) {
        this.url = url || '/';
        if (!/\/$/.test(this.url)) { this.url +='/'; }
    }

    /**
     * @param {string} name
     * @returns {MostClientDataQueryable}
     */
    MostClient.prototype.model = function(name) {
        return new MostClientDataQueryable(name);
    };


    /**
     * @class MostClientDataQueryable
     * @param {string=} model the target model
     * @property {string} $filter - Gets or sets a string that represents a query expression e.g. name eq 'John'
     * @property {string} $select - Gets or sets a comma delimited string that represents the fields to be returned e.g. id,name,description
     * @property {string} $groupby - Gets or sets a comma delimited string that represents the fields to be used in group expression e.g. id,name
     * @property {string} $orderby - Gets or sets a comma delimited string that represents the fields to be used in order expression e.g. name desc,type asc
     * @property {string} $prepared - Gets or sets a string that represents a prepared query expression
     * @property {string} $expand - Gets or sets a comma delimited string that represents an array of fields to be expanded e.g. type,members
     * @property {string} $model - Gets or sets a string that represents the current model name
     * @property {number} $top - Gets or sets an integer that represents the number of records to be retrieved
     * @property {number} $skip - Gets or sets an integer that represents the number of records to be skipped
     * @property {boolean} $array - Gets or sets a boolean that indicates whether the result will be treated as array
     * @property {boolean} $inlinecount - Gets or sets a boolean that indicates whether paging parameters will be included in the result.
     * @constructor
     */
    function MostClientDataQueryable(model) {
        /**
         * Gets or sets a string that represents the target model
         * @type {String}
         */
        this.$model = model;
        /**
         * @private
         */
        this.privates = { };

    }

    MostClientDataQueryable.prototype.copy = function() {
        var self = this, result = new MostClientDataQueryable();
        var keys = Object.keys(this);
        keys.forEach(function(key) { if (key.indexOf('$')==0) {
            result[key] = self[key];
        }
        });
        if (result.$prepared) {
            if (result.$filter)
                result.$filter = MostClientDataQueryable.format('(%s) and (%s)', result.$prepared, result.$filter);
            else
                result.$filter = result.$prepared;
            delete result.$prepared;
        }
        return result;
    };

    MostClientDataQueryable.format = function(f) {
        var i;
        if (typeof f !== 'string') {
            var objects = [];
            for (i  = 0; i < arguments.length; i++) {
                objects.push(inspect(arguments[i]));
            }
            return objects.join(' ');
        }
        i = 1;
        var args = arguments;
        var len = args.length;
        var str = String(f).replace(formatRegExp, function (x) {
            if (x === '%%') return '%';
            if (i >= len) return x;
            switch (x) {
                case '%s':
                    return String(args[i++]);
                case '%d':
                    return Number(args[i++]);
                case '%j':
                    return JSON.stringify(args[i++]);
                default:
                    return x;
            }
        });
        for (var x = args[i]; i < len; x = args[++i]) {
            if (x === null || typeof x !== 'object') {
                str += ' ' + x;
            } else {
                str += ' ' + inspect(x);
            }
        }
        return str;
    };

    MostClientDataQueryable.escape = function(val)
    {
        if (val === undefined || val === null) {
            return 'null';
        }

        switch (typeof val) {
            case 'boolean': return (val) ? 'true' : 'false';
            case 'number': return val+'';
        }

        if (val instanceof Date) {
            var dt = new Date(val);
            var year   = dt.getFullYear();
            var month  = MostClientDataQueryable.zeroPad(dt.getMonth() + 1, 2);
            var day    = MostClientDataQueryable.zeroPad(dt.getDate(), 2);
            var hour   = MostClientDataQueryable.zeroPad(dt.getHours(), 2);
            var minute = MostClientDataQueryable.zeroPad(dt.getMinutes(), 2);
            var second = MostClientDataQueryable.zeroPad(dt.getSeconds(), 2);
            var millisecond = MostClientDataQueryable.zeroPad(dt.getMilliseconds(), 3);
            val = "'" + year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second + '.' + millisecond + "'";
            return val;
        }

        if (typeof val === 'object' && Object.prototype.toString.call(val) === '[object Array]') {
            var values = [];
            val.forEach(function(x) {
                MostClientDataQueryable.escape(x);
            });
            return values.join(',');
        }

        if (typeof val === 'object') {
            if (val.hasOwnProperty('$name'))
            //return field identifier
                return val['$name'];
            else
                return this.escape(val.valueOf())
        }

        val = val.replace(/[\0\n\r\b\t\\\'\"\x1a]/g, function(s) {
            switch(s) {
                case "\0": return "\\0";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\b": return "\\b";
                case "\t": return "\\t";
                case "\x1a": return "\\Z";
                default: return "\\"+s;
            }
        });
        return "'"+val+"'";
    };

    MostClientDataQueryable.zeroPad = function(number, length) {
        number = number || 0;
        var res = number.toString();
        while (res.length < length) {
            res = '0' + res;
        }
        return res;
    };

    /**
     * @private
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.append = function() {

        var self = this, exprs;
        if (self.privates.left) {
            var expr = null;

            if (self.privates.op=='in') {
                if (Array.isArray(self.privates.right)) {
                    //expand values
                    exprs = [];
                    self.privates.right.forEach(function(x) {
                        exprs.push(self.privates.left + ' eq ' + MostClientDataQueryable.escape(x));
                    });
                    if (exprs.length>0)
                        expr = '(' + exprs.join(' or ') + ')';
                }
            }
            else if (self.privates.op=='nin') {
                if (Array.isArray(self.privates.right)) {
                    //expand values
                    exprs = [];
                    self.privates.right.forEach(function(x) {
                        exprs.push(self.privates.left + ' ne ' + MostClientDataQueryable.escape(x));
                    });
                    if (exprs.length>0)
                        expr = '(' + exprs.join(' and ') + ')';
                }
            }
            else
                expr = self.privates.left + ' ' + self.privates.op + ' ' + MostClientDataQueryable.escape(self.privates.right);
            if (expr) {
                if (typeof self.$filter === 'undefined' || self.$filter == null)
                    self.$filter = expr;
                else {
                    self.privates.lop = self.privates.lop || 'and';
                    self.privates._lop = self.privates._lop || self.privates.lop;
                    if (self.privates._lop == self.privates.lop)
                        self.$filter = self.$filter + ' ' + self.privates.lop + ' ' + expr;
                    else
                        self.$filter = '(' + self.$filter + ') ' + self.privates.lop + ' ' + expr;
                    self.privates._lop = self.privates.lop;
                }
            }
        }
        delete self.privates.lop;delete self.privates.left; delete self.privates.op; delete self.privates.right;
        return this;
    };

    MostClientDataQueryable.prototype.model = function(name) {
        if (typeof name !== 'undefined' && name !=null)
            this.$model = name;
        return this;
    };
    /**
     *
     * @param {boolean|*=} value
     * @returns {MostClientDataQueryable}
     */
    MostClientDataQueryable.prototype.inlineCount = function(value) {
        if (typeof value === 'undefined')
            this.$inlinecount = true;
        else
            this.$inlinecount = value;
        return this;
    };
    /**
     *
     * @param {boolean|*=} value
     * @returns {MostClientDataQueryable}
     */
    MostClientDataQueryable.prototype.paged = function(value) {
        return this.inlineCount(value);
    };

    /**
     * @param {Boolean} value
     * @returns {MostClientDataQueryable}
     */
    MostClientDataQueryable.prototype.asArray = function(value) {
        this.$array = value;
        return this;
    };

    /**
     * @param {Array|String} attr
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.select = function(attr) {
        if (Array.isArray(attr)) {
            this.$select = attr.join(',');
        }
        else
            this.$select = attr;
        return this;
    };

    /**
     * @param {Array|String} attr
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.group = function(attr) {
        if (Array.isArray(attr)) {
            this.$groupby = attr.join(',');
        }
        else
            this.$groupby = attr;
        return this;
    };
    /**
     * @param {Array|String} entities
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.expand = function(entities) {
        if (Array.isArray(entities)) {
            this.$expand = entities.join(',');
        }
        else
            this.$expand = entities;
        return this;
    };


    /**
     * @param {String} s
     */
    MostClientDataQueryable.prototype.filter = function(s) {
        var self = this;
        delete this.$filter;
        //clear in-process expression privates
        var p = self.privates;
        delete p.left; delete p.right; delete p.op; delete p.lop; delete p._lop;
        if (typeof s !== 'string')
            return this;
        if (s.length==0)
            return this;
        //set filter
        this.$filter = s;
        return this;
    };

    MostClientDataQueryable.prototype.prepare = function() {
        if (this.$filter) {
            if (typeof this.$prepared === 'undefined' || this.$prepared === null) {
                this.$prepared = this.$filter;
            }
            else {
                this.$prepared = MostClientDataQueryable.format('(%s) and (%s)', this.$prepared, this.$filter);
            }
            delete this.$filter;
        }
        return this;
    };


    MostClientDataQueryable.prototype.toFilter = function() {
        if (typeof this.$filter !== 'undefined' && this.$filter != null) {
            if (typeof this.$prepared === 'undefined' || this.$prepared === null) {
                return this.$filter;
            }
            else {
                return MostClientDataQueryable.format('(%s) and (%s)', this.$prepared, this.$filter);
            }
        }
        else if(typeof this.$prepared !== 'undefined' && this.$prepared != null) {
            return this.$prepared;
        }
    };

    /**
     *
     * @param s
     * @returns {MostClientDataQueryable}
     */
    MostClientDataQueryable.prototype.andAlso = function(s) {
        var self = this;
        if (typeof s !== 'string')
            return self;
        if (s.length==0)
            return self;
        //clear in-process expression privates
        if (self.$filter) {
            self.$filter = '(' + self.$filter + ') and (' + s + ')';
        }
        var p = self.privates;
        p._lop = 'and';
        delete p.left; delete p.right; delete p.op;
        return self;
    };

    /**
     *
     * @param s
     * @returns {MostClientDataQueryable}
     */
    MostClientDataQueryable.prototype.orElse = function(s) {
        var self = this;
        if (typeof s !== 'string')
            return self;
        if (s.length==0)
            return self;
        //clear in-process expression privates
        if (self.$filter)
            self.$filter = '(' + self.$filter + ') or (' + s + ')';
        else
            self.$filter = S;
        var p = self.privates;
        p._lop = 'or';
        delete p.left; delete p.right; delete p.op;
        return self;
    };

    /**
     * @param {number} val
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.take = function(val) {
        this.$top = val;
        return this;
    };
    /**
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.all = function() {
        this.$top = -1;
        return this;
    };
    /**
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.first = function() {
        this.$top = 1;
        this.$skip = 0;
        return this;
    };
    /**
     * @param {number} val
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.skip = function(val) {
        this.$skip = val;
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.orderBy = function(name) {
        if (typeof name !=='undefined' || name!=null)
            this.$orderby = name.toString();
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.orderByDescending = function(name) {
        if (typeof name !=='undefined' || name!=null)
            this.$orderby = name.toString() + ' desc';
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.thenBy = function(name) {
        if (typeof name !=='undefined' || name!=null) {
            this.$orderby += (this.$orderby ? ',' + name.toString() : name.toString());
        }
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.thenByDescending = function(name) {
        if (typeof name !=='undefined' || name!=null) {
            this.$orderby += (this.$orderby ? ',' + name.toString() : name.toString()) + ' desc';
        }
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.where = function(name) {
        delete this.$filter;
        this.privates.left = name;
        return this;
    };

    /**
     * @param {String=} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.and = function(name) {
        this.privates.lop = 'and';
        if (typeof name !== 'undefined')
            this.privates.left = name;
        return this;
    };

    /**
     * @param {String=} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.or = function(name) {
        this.privates.lop = 'or';
        if (typeof name !== 'undefined')
            this.privates.left = name;
        return this;
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.equal = function(value) {
        this.privates.op = Array.isArray(value) ? 'eq' : 'eq';
        this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.eq = function(value) {
        return this.equal(value);
    };

    /**
     * @param {String} name
     * @param {String} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.indexOf = function(name, s) {
        this.privates.left = 'indexof(' + name + ', ' + MostClientDataQueryable.escape(s) +')';
        return this;
    };

    /**
     * @param {String} name
     * @param {String} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.andIndexOf = function(name, s) {
        this.privates.lop = 'and';
        return this.indexOf(name, s);
    };

    /**
     * @param {String} name
     * @param {String} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.orIndexOf = function(name, s) {
        this.privates.lop = 'or';
        return this.indexOf(name, s);
    };

    /**
     * @param {*} name
     * @param {*} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.endsWith = function(name, s) {
        this.privates.left = String.format('endswith(%s,%s)',name,MostClientDataQueryable.escape(s));
        return this;
    };

    /**
     * @param {*} name
     * @param {*} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.startsWith = function(name, s) {
        this.privates.left = String.format('startswith(%s,%s)',name,MostClientDataQueryable.escape(s));
        return this;
    };

    /**
     * @param {*} name
     * @param {*} s
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.substringOf = function(name, s) {
        this.privates.left = String.format('substringof(%s,%s)',name,MostClientDataQueryable.escape(s));
        return this;
    };

    /**
     * @param {*} name
     * @param {number} pos
     * @param {number} length
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.substring = function(name, pos, length) {
        this.privates.left = String.format('substring(%s,%s,%s)',name,pos,length);
        return this;
    };

    /**
     * @param {*} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.length = function(name) {
        this.privates.left = String.format('length(%s)',name);
        return this;
    };

    /**
     * @param {*} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.toLower = function(name) {
        this.privates.left = String.format('tolower(%s)',name);
        return this;
    };

    /**
     * @param {*} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.toUpper = function(name) {
        this.privates.left = String.format('toupper(%s)',name);
        return this;
    }

    /**
     * @param {*} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.trim = function(name) {
        this.privates.left = String.format('trim(%s)',name);
        return this;
    };

    /**
     * @param {*} s0
     * @param {*} s1
     * @param {*=} s2
     * @param {*=} s3
     * @param {*=} s4
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.concat = function(s0, s1, s2, s3, s4) {
        this.privates.left = 'concat(' + MostClientDataQueryable.escape(s0) + ',' + MostClientDataQueryable.escape(s1);
        if (typeof s2 !== 'undefined')
            this.privates.left +=',' + MostClientDataQueryable.escape(s2);
        if (typeof s3 !== 'undefined')
            this.privates.left +=',' + MostClientDataQueryable.escape(s3);
        if (typeof s4 !== 'undefined')
            this.privates.left +=',' + MostClientDataQueryable.escape(s4);
        this.privates.left +=')';
        return this;
    };

    MostClientDataQueryable.prototype.field = function(name) {
        return { "$name":name }
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.day = function(name) {
        this.privates.left = String.format('day(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.day = function(name) {
        this.privates.left = String.format('hour(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.minute = function(name) {
        this.privates.left = String.format('minute(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.month = function(name) {
        this.privates.left = String.format('month(%s)',name);
        return this;
    };


    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.second = function(name) {
        this.privates.left = String.format('second(%s)',name);
        return this;
    };


    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.year = function(name) {
        this.privates.left = String.format('year(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.round = function(name) {
        this.privates.left = String.format('round(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.floor = function(name) {
        this.privates.left = String.format('floor(%s)',name);
        return this;
    };

    /**
     * @param {String} name
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.ceiling = function(name) {
        this.privates.left = util.ceiling('floor(%s)',name);
        return this;
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.notEqual = function(value) {
        this.privates.op = Array.isArray(value) ? 'nin' : 'ne';
        this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.ne = function(value) {
        return this.notEqual(value);
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.greaterThan = function(value) {
        this.privates.op = 'gt';this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.gt = function(value) {
        return this.greaterThan(value);
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.greaterOrEqual = function(value) {
        this.privates.op = 'ge';this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.ge = function(value) {
        return this.greaterOrEqual(value);
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.lowerThan = function(value) {
        this.privates.op = 'lt';this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.lt = function(value) {
        return this.lowerThan(value);
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.lowerOrEqual = function(value) {
        this.privates.op = 'le';this.privates.right = value; return this.append();
    };

    /**
     * @param {*} value
     * @returns MostClientDataQueryable
     */
    MostClientDataQueryable.prototype.le = function(value) {
        return this.lowerOrEqual(value);
    };


    var _most = {
        /**
         * @param {string=} url
         * @returns {MostClient}
         */
        most:function(url) {
            return new MostClient(url);
        }
    };
    /**
     * extend jQuery
     */
    $.extend($, _most);

})(window);