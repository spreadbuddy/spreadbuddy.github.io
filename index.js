const dictionary = {
	allCapsExceptions: [ // Do not count each letter as a syllable
		'NATO',
		'MAGA',
		'LEGO',
		'NAFTA',
		'ASEAN',
		'NASA',
		'VISA'
	],
	allLowerCaseExceptions: [ // Pronounce each letter
		'http',
		'https'
	],
	customSyllableCounts: {
		'w/' : 1,
		'w/o' : 2,
		'i/o' : 2,
		'era' : 2
	}
};

function begin() {
	$('#speech-player').removeAttr('hidden');
	$('#main-screen-top').attr('hidden', '');

	let data = bounce();
	$('html, body').css('background-color', '#242A2D');
	loadChunk(data, 1, 1, 0);
}

function getSPM() {
	return Math.round(toInt($('#speed').val()));
}

const humanResponseTime = 80;
var firstWord = true;

function loadChunk(data, chunkIndex, hue) {

	pauseState = null;

	if (restart) {
		chunkIndex = 0;
		restart = false;
	}

	if (pause === true) {
		pauseState = [...arguments];
		return;
	}

	let stringify = function (accumulator, currentValue) {
		return accumulator + currentValue[0] + ' ';
	};

	let startTime = Date.now();
	if (chunkIndex >= data.length - 1) quit = true;

	if (quit) {
		pauseState = null;
		restart = false;
		pause = false;
		quit = false;
		exit();
		return;
	}

	$('#past').html(data.slice(Math.max(chunkIndex - 100, 0), chunkIndex).reduce(stringify, ''));
	$('article, #now').html(data[chunkIndex][0]);
	$('#future').html(data.slice(chunkIndex + 1, Math.min(chunkIndex + 100, data.length)).reduce(stringify, ''));

	let thisWordSyllables = data[chunkIndex][1];
	$('progress').val(calcTimeProgress(chunkIndex, data));

	$('article').css('color', $('#no-colors').is(':checked') ? `hsl(${hue}, 100%, 80%)` : 'white');
	hue = (hue + 151) % 360;

	chunkIndex += keyMap['ArrowLeft'] ? -1 : 1;
	if (chunkIndex <= 0) chunkIndex = 1;

	setTimeout(function () { loadChunk(data, chunkIndex, hue) }, Math.max(firstWord ? (() => {firstWord = false; return humanResponseTime})() : 5, getFrameDuration(thisWordSyllables) * 1000 - (Date.now() - startTime)));
}

$('#go-button').on('click', function () {
	$('#splash-panel').css('left', '-100vw');
	$('#splash-panel').on('transitionend', function(e) {
		if ($(e.target).is('#splash-panel')) $(e.currentTarget).css('display', 'none');
	});
	$('#main-panel').css('filter', 'blur(0)');
});
$('#start-button').on('click', begin);

const toInt = parseInt;

var restart = false;
var quit = false;

function calcTimeProgress(chunkIndex, chunkArray) {
	const syllableSum = (accumulator, current) => accumulator + getFrameDuration(current[1]);
	let passed = chunkArray.slice(0, chunkIndex + 1).reduce(syllableSum, 0);
	let comingUp = chunkArray.slice(chunkIndex + 1, chunkArray.length).reduce(syllableSum, 0);
	return passed / (passed + comingUp);
}

function getFrameDuration(syllableCount) {
	let x = syllableCount;
	let a = toInt($('#exp').val()) / 100;
	let b = toInt($('#scale').val()) / 100;
	let c = toInt($('#uni-syll').val()) / 100;
	let frameDuration = 60 / toInt($('#speed').val()) * (
		5 / 3 * (((x + 10 * (x / (2 + 5 * a)) ** (1 - a / 2)) - 2) / (10 * (a + 1) * (b + 1)) - ((1 + 10 * (1 / (2 + 5 * a)) ** (1 - a / 2)) - 2) / (10 * (a + 1) * (b + 1))) + 1
	);
	frameDuration += ((x === 1) ? (getFrameDuration(2) - frameDuration) * c : 0);
	frameDuration = Math.round(frameDuration * 1000) / 1000;
	return frameDuration;
}

function countSyllables(word) {
	if (!isNaN(toInt(word))) return 1; // TODO: convert number to word to calc syllables
	if (/^[A-Z]+$/.test(word)) return word.length + (word.match(/W/g) || '').length * 2; // If the word is all caps
  word = word.toLowerCase();
  // if (word === 'w') return 3; // hmm, what about " w/ for with? "
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  return (word.match(/[aeiouy]{1,3}/g) || [null]).length;
}

function bounce() {
	let text = $('textarea').val();
	let r = /([^\w‘'’-]+|(?<=\s+)-(?=\s+)|(?<=\s+)[‘'’]|[‘'’](?=\s+))/ugmi;
	let words = (text.split(r)).filter(function (a) {return /\w/ugmi.test(a)});
	let phonicsMap = [];
	for (let word of words) {
		phonicsMap.push([word, countSyllables(word)]);
	}
	let totalSyllables = phonicsMap.reduce(function (accumulator, current) { return accumulator + current[1] }, 0);
	$('#aspw').html(Math.round(totalSyllables / Math.max(phonicsMap.length, 1) * 100) / 100);

	let time = phonicsMap.reduce(function (accumulator, current) { return accumulator + getFrameDuration(current[1]) }, 0);
	
	let seconds = Math.ceil(time);
	let minutes = Math.floor(seconds / 60);
	$('#duration-calc').html(minutes + ':' + (seconds - minutes * 60).toString().padStart(2, '0'));

	$('#wpm').html(Math.round(words.length / (seconds / 60)));
	$('#word-count').html(words.length);

	let newPhonics = [];
	let cache = '';
	for (let block of phonicsMap) { // edit for even distribution
		if (block[0].length <= 3 && block[1] === 1 && (cache.match(/ /g) || []).length <= 1) {
			cache += block[0] + ' ';
		}
		else {
			if (cache.length > 0) {
				newPhonics.push([cache.substring(0, cache.length - 1).replace(' ', '&nbsp;'), countSyllables(cache)]);
				cache = '';
			}
			newPhonics.push(block);
		}
	}
	phonicsMap = newPhonics;

	let blank = ['', 1];
	phonicsMap.unshift(blank);
	phonicsMap.push(blank);

	return phonicsMap;
}

function globalUpdate() {
	$('#spm').html(getSPM());
	$('#single-syllable').html(getFrameDuration(1));
	$('#double-syllable').html(getFrameDuration(2));
	$('#triple-syllable').html(getFrameDuration(3));
	$('#quadruple-syllable').html(getFrameDuration(4));
	$('#quintuple-syllable').html(getFrameDuration(5));

	bounce();

	$('#duration-calc').html();
}

function exit() {
	$('#speech-player').attr('hidden', '');
	$('#main-screen-top').removeAttr('hidden');
	$('html, body').css('background-color', '#546E7A');
}

function playSound(fileName) {
	let audioObject = new Audio(fileName);
	audioObject.volume = 0.5;
	audioObject.play();
}

$('label').on('click', function() {
	playSound('tap.wav');
});
$('.button').on('pointerdown', function() {
	playSound('action.wav');
});
$('.button').on('pointerup', function() {
	playSound('release.wav');
});

$('textarea, #speed, #scale, #exp, #uni-syll').on('input', globalUpdate);
$('textarea, #speed, #scale, #exp, #uni-syll').on('change', globalUpdate);
$('#font-size').on('input', function (e) {
	$('#textbox-wrapper').css('font-size', (toInt($(e.target).val()) / 10) ** 2 + 'rem');
});
$('#font-weight').on('input', function (e) {
	$('#textbox-wrapper').css('font-weight', toInt($(e.target).val()) * 100);
});
$('#gap').on('input', function (e) {
	$('article').css('letter-spacing', `${toInt($(e.target).val()) / 100}em`);
});
$('#gap2').on('input', function (e) {
	$('article').css('word-spacing', `${toInt($(e.target).val()) / 100}em`);
});
var fadeOutWheelIndicator = function (e) {
	if ($(e.target).hasClass('scroller')) {
		$('#scroll-pop').css('opacity', '0');
		fadeOutWheelIndicator = function () {};
	}
};

function bokehHeroBackground() {
	let scrollPosition = toInt($('#splash-panel').scrollTop());
	$('#backdrop').css({
		'background-position' : `center ${scrollPosition / 2}px`,
		'filter' : `blur(calc(1rem * ${(scrollPosition / $(window).height()) ** 2}))`
	});
}
$('#splash-panel').on('scroll wheel', bokehHeroBackground);
$(window).on('resize', bokehHeroBackground);
$('.scroller').on('scroll', function(e) {
	fadeOutWheelIndicator(e);
});

var pause, pauseState;
var keyMap = {};

$(window).on('keydown', function(e) {
	e.preventDefault();
	if (keyMap[e.key] === true) return false;
	keyMap[e.key] = true;
	let activeButton = $(`[data-key="${e.key}"]`);
	activeButton.addClass('activated');
	activeButton.trigger('pointerdown');
	return false;
});

var lastTapped;

function showLineGuide() {
	$('footer').css({
		'opacity' : '0.75',
		'margin-top' : '3rem',
		'filter' : 'blur(0)',
		'font-size' : '1.5rem'
	});
}
function hideLineGuide() {
	$('footer').css({
		'opacity' : '0',
		'margin-top' : '0',
		'filter' : 'blur(0.5rem)',
		'font-size' : '1rem'
	});
}

$('#rewind').on('pointerdown', function () {showLineGuide();lastTapped = 'rewind'});

$('#pause').on('pointerdown', function () {
	showLineGuide();
	pause = true;
	lastTapped = 'pause';
});
$(window).on('pointerup', function () {
	switch (lastTapped) {
		case 'pause':
			hideLineGuide();
			pause = false;
			firstWord = true;
			if (pauseState === null) return;
			loadChunk(...pauseState);
			break;
		case 'rewind':
			hideLineGuide();
			break;
	}
});
$('#restart').on('click', function () {
	restart = true;
});
$('#exit').on('click', function () {
	quit = true;
});

setInterval(function () {
	if (keyMap['ArrowDown'] === true) {
		$('#speed').val(function(i, oldVal) {
		  return Math.max(toInt(oldVal) - 10, toInt($('#speed').attr('min')));
		});
		globalUpdate();
	}
	if (keyMap['ArrowUp'] === true) {
		$('#speed').val(function(i, oldVal) {
		  return Math.min(toInt(oldVal) + 10, toInt($('#speed').attr('max')));
		});
		globalUpdate();
	}
}, 100);
$('#slowdown, #speedup, #rewind').on('pointerdown pointerup', function(e) {
	keyMap[$(e.currentTarget).attr('data-key')] = (e.type === 'pointerdown');
});

$(window).on('keyup', function(e) {
	keyMap[e.key] = false;
	let activeButton = $(`[data-key="${e.key}"]`);
	activeButton.removeClass('activated');
	activeButton.trigger('pointerup');
	activeButton.click();
	return false;
});

globalUpdate();
