'use strict';

var A, I, D, U, E, F, C, N, X, W, Z, FS, TPL, DOM, AF, L, AV, P,

	app = app || null,
	SecureFeedbackEmailForAnswer,
	l = [], //text
	myHistory = [], //navigation

	navState = {

		page: [''],
		search: [],
		numPage: 0,
		sort: -1

	},

	common = {

		contentSecurityPolicy: true,
		useLocalStorage: true,
		swipeSpeed: 300,
		messagesInBlock: 25,
		transitionSpeed: 400,
		swipeLongSpeed: 300,
		swipeDeltaToContinue: 50,
		emptyProgressDuration: 500,
		iframeMode: app ? 1 : 2, // 1 - inline, 2 - dynamic
		firstVisit: true,

		subjPrefixRE: [

			'\\s*re[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',
			'\\s*aw[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',
			'\\s*rv[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',
			'\\s*sv[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',
			'\\s*fw[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',
			'\\s*fwd[\\s\\[]*(\\d*)[\\s\\]]*\\:\\s*',

		],

		phoneNumberRE: [

			new RegExp(/(\+|&#43;)([1-9]{1,5}\s?[(-]?\s?[0-9]{1,5}\s?[)-]?\s?[0-9]{1,}\s?[-]?\s?[0-9]{1,}\s?[-]?\s?[0-9]{1,})/, 'img'),
			new RegExp(/(\d)([\s-]\d{2,4}[\s-]\d{2,4}[\s-]\d[\d\s-]{1,}\d)/, 'img'),

		],

		emailRE: [

			new RegExp(/([a-z0-9][a-z0-9_.\-+'=]*[a-z0-9]@[a-z0-9][a-z0-9\-.]*[a-z0-9]\.[a-z]{2,7})/, 'img'),
						
		],

		linksRE: [

			new RegExp(/(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b[-a-zA-Z0-9@:%_+.~#?&//=]*)/, 'img'),
						
		],

	},

	languages = {

		en: '/lang/en.json',

	},

	options = {

		's': 1 << 20,
		'ms': 1024*1024*10,
		'u0': {
			'd': 1024*1024*15,
			't': {
				'1': '1 hour',
				'6': '6 hours',
				'12': '12 hours',
				'24': '24 hours',
			},
			'a': 1,
			'r': 1,
			'l': 1024*1024*5,
			'c': 1,
		},

		'u1': {
			'd': 1024*1024*1024,
			't': {
				1: '1 hour',
				6: '6 hours',
				12: '12 hours',
				24: '24 hours',
				48: '2 days',
				72: '3 days',
				96: '4 days',
				120: '5 days',
				144: '6 days',
				168: '7 days',
				720: '1 month',
				1440: '2 months',
				2160: '3 months',
				4320: '6 months',
				8760: '1 year',
			},
			'x': 3,
			'a': 5,
			'r': 5,
			'l': 1024*1024*50,
			'c': 0,
		},

		'u2': {
			'd': 1024*1024*1024,
			't': {
				1: '1 hour',
				6: '6 hours',
				12: '12 hours',
				24: '24 hours',
				48: '2 days',
				72: '3 days',
				96: '4 days',
				120: '5 days',
				144: '6 days',
				168: '7 days',
				720: '1 month',
				1440: '2 months',
				2160: '3 months',
				4320: '6 months',
				8760: '1 year',
			},
			'x': 3,
			'a': 5,
			'r': 5,
			'l': 1024*1024*50,
			'c': 0,
		},

		'u3': {
			'd': 1024*1024*1024*10,
			't': {
				1: '1 hour',
				6: '6 hours',
				12: '12 hours',
				24: '24 hours',
				48: '2 days',
				72: '3 days',
				96: '4 days',
				120: '5 days',
				144: '6 days',
				168: '7 days',
				720: '1 month',
				1440: '2 months',
				2160: '3 months',
				4320: '6 months',
				8760: '1 year',
				26280: '3 years',
			},
			'x': 10,
			'a': 50,
			'r': 20,
			'l': 1024*1024*500,
			'c': 0,
			'cost': {
				'monthly': 1,
				'yearly': 1,
				'1 year': {
					'units': 12
				},
				'2 years': {
					'units': 24,
					'discount': 0
				},
				'3 years': {
					'units': 36,
					'discount': 0
				},
				'5 years': {
					'units': 60,
					'discount': 0
				},
				'10 years': {
					'units': 120,
					'discount': 0
				},
			},
		},

		'u4': {
			'd': 1024*1024*1024*100,
			't': {
				1: '1 hour',
				6: '6 hours',
				12: '12 hours',
				24: '24 hours',
				48: '2 days',
				72: '3 days',
				96: '4 days',
				120: '5 days',
				144: '6 days',
				168: '7 days',
				720: '1 month',
				1440: '2 months',
				2160: '3 months',
				4320: '6 months',
				8760: '1 year',
				17520: '2 years',
				26280: '3 years',
				43800: '5 years',
				87600: '10 years',
			},
			'x': 20,
			'a': 100,
			'r': 100,
			'l': 1024*1024*1024*50,
			'c': 0,
			'cost': {
				'monthly': 0.25,
				'yearly': 0.25,
				'1 year': {
					'units': 12
				},
				'2 years': {
					'units': 24,
					'discount': 10
				},
				'3 years': {
					'units': 36,
					'discount': 20
				},
				'5 years': {
					'units': 60,
					'discount': 25
				},
				'10 years': {
					'units': 120,
					'discount': 30
				},
			},
		},

		'u5': {
			'd': 1024*1024*1024*100,
			't': {
				1: '1 hour',
				6: '6 hours',
				12: '12 hours',
				24: '24 hours',
				48: '2 days',
				72: '3 days',
				96: '4 days',
				120: '5 days',
				144: '6 days',
				168: '7 days',
				720: '1 month',
				1440: '2 months',
				2160: '3 months',
				4320: '6 months',
				8760: '1 year',
				17520: '2 years',
				26280: '3 years',
				43800: '5 years',
				87600: '10 years',
			},
			'a': 100,
			'r': 100,
			'l': 1024*1024*1024*50,
			'c': 0,
		}

	};