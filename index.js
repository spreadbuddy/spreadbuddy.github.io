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

function getSPM() {
	return Math.round(parseInt($('#speed').val()));
}

function loadChunk(data, chunkIndex, elapsed, hue) {

	let startTime = Date.now();
	if (chunkIndex >= data.length - 1) return false;

	$('#followed-by').html(data[chunkIndex - 1][0]);
	$('article').html(data[chunkIndex][0]);
	$('#following').html(data[chunkIndex + 1][0]);

	let thisWordSyllables = data[chunkIndex][1];
	elapsed += getFrameDuration(thisWordSyllables) * 100;
	$('progress').val(elapsed);

	$('article').css('color', $('#no-colors').is(':checked') ? `hsl(${hue}, 100%, 90%)` : 'white');
	hue = (hue + 151) % 360;

	chunkIndex += 1;

	setTimeout(function () { loadChunk(data, chunkIndex, elapsed, hue) }, Math.max(10, getFrameDuration(thisWordSyllables) * 1000 - (Date.now() - startTime)));
}

$('#go-button').on('click', function () {
	$('#splash-panel').css('left', '-100vw');
});
$('#start-button').on('click', function () {
	$('#speech-player').removeAttr('hidden');
	$('#main-screen-top').attr('hidden', '');

	let data = bounce();
	$('html, body').css('background-color', '#242A2D');
	loadChunk(data, 1, 1, 0);
});

function getFrameDuration(syllableCount) {
	let x = syllableCount;
	let a = parseInt($('#exp').val()) / 100;
	let b = parseInt($('#scale').val()) / 100;
	let c = parseInt($('#uni-syll').val()) / 100;
	let frameDuration = 60 / parseInt($('#speed').val()) * (
		5 / 3 * (((x + 10 * (x / (2 + 5 * a)) ** (1 - a / 2)) - 2) / (10 * (a + 1) * (b + 1)) - ((1 + 10 * (1 / (2 + 5 * a)) ** (1 - a / 2)) - 2) / (10 * (a + 1) * (b + 1))) + 1
	);
	frameDuration += ((x === 1) ? (getFrameDuration(2) - frameDuration) * c : 0);
	frameDuration = Math.round(frameDuration * 1000) / 1000;
	return frameDuration;
}

function countSyllables(word) {
	if (!isNaN(parseInt(word))) return 1; // TODO: convert number to word to calc syllables
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
	$('progress').attr('max', Math.round(time * 100));
	
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

$('textarea, #speed, #scale, #exp, #uni-syll').on('input', globalUpdate);
$('textarea, #speed, #scale, #exp, #uni-syll').on('change', globalUpdate);
$('#font-size').on('input', function (e) {
	$('#textbox-wrapper').css('font-size', 2 ** (parseInt($(e.target).val()) / 10) + 'rem');
});
$('#font-weight').on('input', function (e) {
	$('#textbox-wrapper').css('font-weight', parseInt($(e.target).val()) * 100);
});
$('#gap').on('input', function (e) {
	$('article').css('letter-spacing', `${parseInt($(e.target).val()) / 100}em`);
});
$('#gap2').on('input', function (e) {
	$('article').css('word-spacing', `${parseInt($(e.target).val()) / 100}em`);
});
$('.scroller').on('scroll', function(e) {
	if ($(e.target).hasClass('scroller')) {
		$('#scroll-pop').css('opacity', '0');
	}
});

globalUpdate();