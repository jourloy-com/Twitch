// eslint-disable-next-line no-undef
module.exports = {
	'env': {
		'browser': true,
		'es2021': true
	},
	'extends': [
		`eslint:recommended`,
		`plugin:@typescript-eslint/recommended`
	],
	'parser': `@typescript-eslint/parser`,
	'parserOptions': {
		'ecmaVersion': `latest`,
		'sourceType': `module`
	},
	'plugins': [
		`@typescript-eslint`
	],
	'rules': {
		'indent': [`error`, `tab`, {
			"SwitchCase": 1, MemberExpression: 1,
			ignoredNodes: [
				`FunctionExpression > .params[decorators.length > 0]`,
				`FunctionExpression > .params > :matches(Decorator, :not(:first-child))`,
				`ClassBody.body > PropertyDefinition[decorators.length > 0] > .key`,
			],
		}],
		'linebreak-style': [`error`, `unix`],
		'quotes': [`warn`, `backtick`],
		'semi': [`warn`, `always`],
		'no-console': `error`,
		'no-compare-neg-zero': 1,
		'no-dupe-args': `error`,
		'no-dupe-else-if': `error`,
		'no-unreachable': `error`,
		'arrow-body-style': [`error`, `as-needed`],
		'camelcase': `error`,
		'eqeqeq': [`error`, `smart`],
		'multiline-comment-style': [`warn`, `starred-block`],
		'no-confusing-arrow': `error`,
		'no-else-return': `error`,
		'no-empty': `error`,
		'no-lonely-if': `error`,
		'no-useless-escape': `warn`,
		'no-useless-return': `error`,
		'no-var': `warn`,
		'spaced-comment': [`warn`, `always`],
		'array-bracket-spacing': [`warn`, `never`],
		'arrow-spacing': [`error`, { 'before': true, 'after': true }],
		'block-spacing': [`error`, `always`],
		'no-multi-spaces': `error`,
		'no-multiple-empty-lines': `error`
	}
};
