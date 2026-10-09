(function () {

    'use strict';


    /* ==========================================
       НАСТРОЙКИ
       ========================================== */

    const FEED_SELECTOR =
        '.uc-orch-feed';

    const FEED_API =
        'https://feeds.tildaapi.com/api/v2/getfeed/';

    const FEED_PAGE_SIZE =
        100;

    const TZ =
        'Europe/Moscow';

    const TZ_OFFSET =
        '+03:00';

    const CALENDAR_SYNC_BASE =
        'https://drdowellshead.github.io/hse-orchestra-calendar-sync/';

    const CALENDAR_SYNC_FILES = {
        all: 'all.ics',
        rehearsals: 'rehearsals.ics',
        concerts: 'concerts.ics',
        meetings: 'meetings.ics',
        other: 'other.ics'
    };

    let selectedCalendarKey =
        'all';


    const state = {

        events: [],

        filter: 'Все',

        year: null,

        month: null,

        selected: null

    };


    /* ==========================================
       HELPERS
       ========================================== */

    const $ = (
        selector,
        root = document
    ) =>
        root.querySelector(
            selector
        );


    const $$ = (
        selector,
        root = document
    ) =>
        Array.from(
            root.querySelectorAll(
                selector
            )
        );


    const clean = value =>

        (
            value || ''
        )

        .replace(
            /\s+/g,
            ' '
        )

        .trim();


    /* ==========================================
       ВИЗУАЛЬНЫЙ КОНТЕКСТ И ПАСХАЛКИ
       ========================================== */

    let toastTimer = null;

    let typedSecret = '';

    let monthClicks = 0;

    let todayClicks = 0;

    let noteClicks = 0;

    let monthTravelClicks = 0;

    let keyboardHintShown = false;

    let lastJeanPhotoIndex = -1;

    let lastJeanQuoteIndex = -1;

    let jeanQuoteBag = [];


    function decorateCalendarRecord() {

        const root =
            $('#orch-calendar');


        const record =
            root?.closest('.t-rec');


        record?.classList.add(
            'orch-calendar-record'
        );


        const footer =
            $('.orch-calendar__footer-note');


        if (
            footer
            &&
            !$('.orch-keyboard-hint', footer)
        ) {

            const hint =
                document.createElement(
                    'span'
                );


            hint.className =
                'orch-keyboard-hint';


            hint.textContent =
                'Не все темы начинаются с ноты.';


            footer.insertBefore(
                hint,
                footer.firstChild
            );

        }


        const secretNote =
            $('#orch-secret-note');


        if (
            secretNote
        ) {

            secretNote.title =
                'Псс… клавиатура тоже инструмент.';

        }

    }


    function specialDateEasterEggMessage(
        month,
        day
    ) {

        if (
            month === 9
            &&
            day === 19
        ) {

            return 'Роняет лес багряный свой убор... А наш оркестр россыпь нот';

        }


        if (
            month === 11
            &&
            day === 19
        ) {

            return 'С Днём Рождения, Ришат!';

        }


        return '';

    }


    function showToast(
        message
    ) {

        const toast =
            $('#orch-toast');


        if (
            !toast
        ) {

            return;

        }


        toast.textContent =
            message;


        toast.classList.add(
            'is-visible'
        );


        window.clearTimeout(
            toastTimer
        );


        toastTimer =
            window.setTimeout(
                () => {

                    toast.classList.remove(
                        'is-visible'
                    );

                },
                3200
            );

    }


    function playBeethovenMotif() {

        playToneSequence(
            [
                [392.00, 0.00, 0.13],
                [392.00, 0.17, 0.13],
                [392.00, 0.34, 0.13],
                [311.13, 0.51, 0.55],

                [349.23, 1.18, 0.13],
                [349.23, 1.35, 0.13],
                [349.23, 1.52, 0.13],
                [293.66, 1.69, 0.66]
            ],
            'triangle',
            0.058
        );

    }

    let musicAudioContext = null;


    function getMusicAudioContext() {

        const AudioContextClass =
            window.AudioContext
            ||
            window.webkitAudioContext;


        if (
            !AudioContextClass
        ) {

            return null;

        }


        if (
            !musicAudioContext
            ||
            musicAudioContext.state ===
            'closed'
        ) {

            musicAudioContext =
                new AudioContextClass();

        }


        return musicAudioContext;

    }


    function playToneSequence(
        notes,
        waveform = 'sine',
        volume = 0.055
    ) {

        const context =
            getMusicAudioContext();


        if (
            !context
            ||
            !Array.isArray(
                notes
            )
            ||
            !notes.length
        ) {

            return;

        }


        /*
         * Раньше каждая пасхалка создавала новый AudioContext.
         * На мобильных браузерах после нескольких запусков это
         * может приводить к тихому звуку или полному молчанию.
         * Теперь весь музыкальный слой использует один контекст.
         */
        const volumeFloor = {

            sine: 0.060,
            triangle: 0.056,
            square: 0.052,
            sawtooth: 0.050

        };


        const effectiveVolume =
            Math.min(
                0.090,
                Math.max(
                    Number(
                        volume
                    )
                    ||
                    0.045,
                    volumeFloor[
                        waveform
                    ]
                    ||
                    0.045
                )
            );


        const schedule =
            () => {

                const baseTime =
                    context.currentTime +
                    0.025;


                notes.forEach(
                    ([frequency, delay, duration]) => {

                        const safeFrequency =
                            Number(
                                frequency
                            );


                        const safeDelay =
                            Math.max(
                                0,
                                Number(
                                    delay
                                )
                                ||
                                0
                            );


                        const safeDuration =
                            Math.max(
                                0.055,
                                Number(
                                    duration
                                )
                                ||
                                0.12
                            );


                        if (
                            !Number.isFinite(
                                safeFrequency
                            )
                            ||
                            safeFrequency <= 0
                        ) {

                            return;

                        }


                        const start =
                            baseTime +
                            safeDelay;


                        const stop =
                            start +
                            safeDuration;


                        const oscillator =
                            context.createOscillator();


                        const gain =
                            context.createGain();


                        oscillator.type =
                            waveform;


                        oscillator.frequency
                            .setValueAtTime(
                                safeFrequency,
                                start
                            );


                        gain.gain
                            .setValueAtTime(
                                0.0001,
                                start
                            );


                        gain.gain
                            .exponentialRampToValueAtTime(
                                effectiveVolume,
                                start +
                                Math.min(
                                    0.014,
                                    safeDuration *
                                    0.3
                                )
                            );


                        gain.gain
                            .exponentialRampToValueAtTime(
                                0.0001,
                                stop
                            );


                        oscillator.connect(
                            gain
                        );


                        gain.connect(
                            context.destination
                        );


                        oscillator.start(
                            start
                        );


                        oscillator.stop(
                            stop +
                            0.03
                        );


                        /*
                         * Телефонные динамики заметно теряют низ
                         * примерно до 160–180 Гц. Для таких нот
                         * добавляем тихую октаву сверху. Основной
                         * голос остаётся на месте, но мотив слышен
                         * даже на небольшом динамике телефона.
                         */
                        if (
                            safeFrequency <
                            180
                        ) {

                            const helperOscillator =
                                context.createOscillator();


                            const helperGain =
                                context.createGain();


                            helperOscillator.type =
                                'triangle';


                            helperOscillator.frequency
                                .setValueAtTime(
                                    safeFrequency *
                                    2,
                                    start
                                );


                            helperGain.gain
                                .setValueAtTime(
                                    0.0001,
                                    start
                                );


                            helperGain.gain
                                .exponentialRampToValueAtTime(
                                    effectiveVolume *
                                    0.46,
                                    start +
                                    Math.min(
                                        0.014,
                                        safeDuration *
                                        0.3
                                    )
                                );


                            helperGain.gain
                                .exponentialRampToValueAtTime(
                                    0.0001,
                                    stop
                                );


                            helperOscillator.connect(
                                helperGain
                            );


                            helperGain.connect(
                                context.destination
                            );


                            helperOscillator.start(
                                start
                            );


                            helperOscillator.stop(
                                stop +
                                0.03
                            );

                        }

                    }
                );

            };


        if (
            context.state ===
            'suspended'
        ) {

            context.resume()
                .then(
                    schedule
                )
                .catch(
                    () => {}
                );

        }

        else {

            schedule();

        }

    }

    function clearMusicModes() {

        $('#orch-calendar')
        ?.classList.remove(
            'is-beethoven',
            'is-bach',
            'is-tchaikovsky',
            'is-mission'
        );

    }


    function activateMusicMode(
        className,
        message,
        music
    ) {

        const root =
            $('#orch-calendar');


        clearMusicModes();


        window.requestAnimationFrame(
            () => {

                root?.classList.add(
                    className
                );

            }
        );


        showToast(
            message
        );


        music();


        window.setTimeout(
            clearMusicModes,
            2800
        );

    }


    function noteFrequency(
        noteName
    ) {

        const match =
            String(
                noteName || ''
            )
            .match(
                /^([A-G])([#b]?)(-?\d+)$/
            );


        if (
            !match
        ) {

            return 440;

        }


        const semitones = {
            C: 0,
            D: 2,
            E: 4,
            F: 5,
            G: 7,
            A: 9,
            B: 11
        };


        let pitch =
            semitones[
                match[1]
            ];


        if (
            match[2] === '#'
        ) {

            pitch++;

        }


        if (
            match[2] === 'b'
        ) {

            pitch--;

        }


        const octave =
            Number(
                match[3]
            );


        const midi =
            (
                octave + 1
            ) * 12 +
            pitch;


        return 440 *
            Math.pow(
                2,
                (
                    midi - 69
                ) /
                12
            );

    }


    function playNamedToneSequence(
        notes,
        waveform = 'triangle',
        volume = 0.045
    ) {

        const source =
            Array.isArray(
                notes
            )

                ? notes.filter(
                    item =>
                        Array.isArray(
                            item
                        )
                        &&
                        item.length >= 3
                )

                : [];


        if (
            !source.length
        ) {

            return;

        }


        const end =
            Math.max(
                ...source.map(
                    ([, delay, duration]) =>
                        delay + duration
                )
            );


        let extended =
            source;


        /*
         * Короткие цитаты стали чуть длиннее:
         * повторяем начало той же самой музыкальной фразы,
         * а не сочиняем продолжение за композитора.
         */
        if (
            end < 3.6
        ) {

            const repeatCount =
                Math.min(
                    source.length,
                    Math.max(
                        4,
                        Math.ceil(
                            source.length *
                            0.4
                        )
                    )
                );


            const opening =
                source.slice(
                    0,
                    repeatCount
                );


            const firstDelay =
                opening[0][1];


            const repeatAt =
                end + 0.22;


            extended = [
                ...source,
                ...opening.map(
                    ([note, delay, duration]) => [
                        note,
                        repeatAt +
                        (
                            delay -
                            firstDelay
                        ),
                        duration
                    ]
                )
            ];

        }


        playToneSequence(
            extended.map(
                ([note, delay, duration]) => [
                    noteFrequency(
                        note
                    ),
                    delay,
                    duration
                ]
            ),
            waveform,
            volume
        );

    }


    function playSimpleNamedMelody(
        noteNames,
        step = 0.22,
        duration = 0.18,
        waveform = 'triangle',
        volume = 0.045
    ) {

        playNamedToneSequence(
            noteNames.map(
                (note, index) => [
                    note,
                    index * step,
                    duration
                ]
            ),
            waveform,
            volume
        );

    }


    const MUSICAL_EASTER_EGGS = {

        beethoven: {
            aliases: [
                'BEETHOVEN',
                'БЕТХОВЕН'
            ],
            month: 11,
            day: 16,
            label: 'LV',
            title: '16 декабря — день рождения Людвига ван Бетховена',
            className: 'is-beethoven',
            message: 'Та-та-та-тааам. Симфония № 5.',
            play: playBeethovenMotif
        },

        bach: {
            aliases: [
                'BACH',
                'БАХ'
            ],
            month: 2,
            day: 31,
            label: 'BACH',
            title: '31 марта — день рождения Иоганна Себастьяна Баха',
            className: 'is-bach',
            message: 'B–A–C–H: си-бемоль, ля, до, си.',
            play: () => playNamedToneSequence(
                [
                    ['Bb4', 0.00, 0.28],
                    ['A4', 0.30, 0.28],
                    ['C5', 0.60, 0.28],
                    ['B4', 0.90, 0.52]
                ],
                'sine',
                0.055
            )
        },

        tchaikovsky: {
            aliases: [
                'TCHAIKOVSKY',
                'TCHAIKOVSKI',
                'ЧАЙКОВСКИЙ'
            ],
            month: 4,
            day: 7,
            label: 'П.И.',
            title: '7 мая — день рождения Петра Ильича Чайковского',
            className: 'is-tchaikovsky',
            message: '«Лебединое озеро»: героический финал.',
            play: () => playNamedToneSequence(
                [
                    ['F#4', 0.00, 0.30],
                    ['B4', 0.32, 0.28],
                    ['C#5', 0.62, 0.20],
                    ['D#5', 0.84, 0.20],
                    ['E5', 1.06, 0.28],
                    ['F#5', 1.36, 0.34],
                    ['D#5', 1.74, 0.22],
                    ['F#5', 1.98, 0.30],
                    ['D#5', 2.30, 0.20],
                    ['F#5', 2.52, 0.52]
                ],
                'triangle',
                0.052
            )
        },

        mission: {
            aliases: [
                'MISSIONIMPOSSIBLE',
                'MISSION',
                'МИССИЯ'
            ],
            label: 'MI',
            title: 'Mission: Impossible',
            className: 'is-mission',
            message: 'Миссия выполнима. И да — это пять четвертей.',
            play: () => playNamedToneSequence(
                [
                    ['G2', 0.00, 0.30],
                    ['G2', 0.38, 0.30],
                    ['Bb2', 0.76, 0.18],
                    ['C3', 1.00, 0.18],
                    ['G2', 1.30, 0.30],
                    ['G2', 1.68, 0.30],
                    ['F2', 2.06, 0.18],
                    ['F#2', 2.30, 0.34]
                ],
                'square',
                0.047
            )
        },

        vivaldi: {
            aliases: [
                'VIVALDI',
                'ВИВАЛЬДИ'
            ],
            month: 2,
            day: 4,
            label: 'AV',
            title: '4 марта — день рождения Антонио Вивальди',
            className: 'is-bach',
            message: '«Весна» пришла. Даже если за окном ноябрь.',
            play: () => playNamedToneSequence(
                [
                    ['E5', 0.00, 0.16],
                    ['G#5', 0.18, 0.13],
                    ['G#5', 0.33, 0.13],
                    ['G#5', 0.48, 0.13],
                    ['F#5', 0.64, 0.16],
                    ['E5', 0.82, 0.20],
                    ['B5', 1.05, 0.16],
                    ['B5', 1.23, 0.14],
                    ['A5', 1.40, 0.16],
                    ['G#5', 1.58, 0.34]
                ],
                'triangle',
                0.047
            )
        },

        wagner: {
            aliases: [
                'WAGNER',
                'ВАГНЕР'
            ],
            month: 4,
            day: 22,
            label: 'RW',
            title: '22 мая — день рождения Рихарда Вагнера',
            className: 'is-beethoven',
            message: 'Валькирии уже вылетели. Валторны тоже.',
            play: () => playNamedToneSequence(
                [
                    ['F#4', 0.00, 0.20],
                    ['B4', 0.20, 0.34],
                    ['F#5', 0.56, 0.18],
                    ['B4', 0.76, 0.20],
                    ['D5', 0.98, 0.34],
                    ['B4', 1.34, 0.18],
                    ['D5', 1.54, 0.20],
                    ['B4', 1.76, 0.18],
                    ['D5', 1.96, 0.20],
                    ['F#5', 2.18, 0.50]
                ],
                'sawtooth',
                0.030
            )
        },

        bizet: {
            aliases: [
                'BIZET',
                'БИЗЕ'
            ],
            month: 9,
            day: 25,
            label: 'GB',
            title: '25 октября — день рождения Жоржа Бизе',
            className: 'is-tchaikovsky',
            message: 'L’amour est un oiseau rebelle… Habanera.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.28],
                    ['C#5', 0.30, 0.16],
                    ['C5', 0.48, 0.20],
                    ['C5', 0.70, 0.13],
                    ['C5', 0.85, 0.20],
                    ['B4', 1.08, 0.18],
                    ['Bb4', 1.28, 0.20],
                    ['A4', 1.50, 0.24],
                    ['A4', 1.77, 0.16],
                    ['Ab4', 1.95, 0.42]
                ],
                'triangle',
                0.050
            )
        },

        mozart: {
            aliases: [
                'MOZART',
                'МОЦАРТ'
            ],
            month: 0,
            day: 27,
            label: 'WA',
            title: '27 января — день рождения Вольфганга Амадея Моцарта',
            className: 'is-bach',
            message: 'Eine kleine Nachtmusik. Очень маленькая — всего пара тактов.',
            play: () => playNamedToneSequence(
                [
                    ['G5', 0.00, 0.28],
                    ['D5', 0.36, 0.14],
                    ['G5', 0.53, 0.28],
                    ['D5', 0.89, 0.14],
                    ['G5', 1.06, 0.14],
                    ['D5', 1.22, 0.14],
                    ['G5', 1.38, 0.14],
                    ['B5', 1.54, 0.14],
                    ['D6', 1.70, 0.42]
                ],
                'triangle',
                0.047
            )
        },

        rimsky: {
            aliases: [
                'RIMSKYKORSAKOV',
                'RIMSKY',
                'РИМСКИЙКОРСАКОВ',
                'РИМСКИЙ'
            ],
            month: 2,
            day: 18,
            label: 'Н.Р.',
            title: '18 марта — день рождения Николая Римского-Корсакова',
            className: 'is-mission',
            message: 'Шмель пролетел. Очень быстро.',
            play: () => playNamedToneSequence(
                [
                    ['E6', 0.00, 0.065],
                    ['D#6', 0.07, 0.065],
                    ['D6', 0.14, 0.065],
                    ['C#6', 0.21, 0.065],
                    ['D6', 0.28, 0.065],
                    ['C#6', 0.35, 0.065],
                    ['C6', 0.42, 0.065],
                    ['B5', 0.49, 0.065],
                    ['C6', 0.56, 0.065],
                    ['B5', 0.63, 0.065],
                    ['Bb5', 0.70, 0.065],
                    ['A5', 0.77, 0.065],
                    ['G#5', 0.84, 0.065],
                    ['G5', 0.91, 0.065],
                    ['F#5', 0.98, 0.065],
                    ['F5', 1.05, 0.14]
                ],
                'sawtooth',
                0.022
            )
        },

        borodin: {
            aliases: [
                'BORODIN',
                'БОРОДИН'
            ],
            month: 10,
            day: 12,
            label: 'А.Б.',
            title: '12 ноября — день рождения Александра Бородина',
            className: 'is-beethoven',
            message: 'Симфония № 2. Никаких реверансов — сразу богатырская сила.',
            play: () => playNamedToneSequence(
                [
                    ['B3', 0.00, 0.30],
                    ['B3', 0.32, 0.16],
                    ['B3', 0.50, 0.28],
                    ['C4', 0.80, 0.20],
                    ['E4', 1.02, 0.26],
                    ['Eb4', 1.30, 0.22],
                    ['B3', 1.54, 0.28],
                    ['D4', 1.84, 0.28],
                    ['B3', 2.14, 0.16],
                    ['B3', 2.32, 0.16],
                    ['B3', 2.50, 0.48]
                ],
                'sawtooth',
                0.032
            )
        },

        mussorgsky: {
            aliases: [
                'MUSSORGSKY',
                'МУСОРГСКИЙ'
            ],
            month: 2,
            day: 21,
            label: 'М.М.',
            title: '21 марта — день рождения Модеста Мусоргского',
            className: 'is-beethoven',
            message: 'Promenade. Пошли по выставке.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.26],
                    ['F4', 0.28, 0.18],
                    ['Bb4', 0.48, 0.26],
                    ['C5', 0.76, 0.38],
                    ['F4', 1.16, 0.24],
                    ['D4', 1.42, 0.18],
                    ['C4', 1.62, 0.22],
                    ['F4', 1.86, 0.28],
                    ['D4', 2.16, 0.20],
                    ['Bb3', 2.38, 0.18],
                    ['C4', 2.58, 0.22],
                    ['G3', 2.82, 0.18],
                    ['F3', 3.02, 0.42]
                ],
                'sawtooth',
                0.026
            )
        },

        prokofiev: {
            aliases: [
                'PROKOFIEV',
                'ПРОКОФЬЕВ'
            ],
            month: 3,
            day: 23,
            label: 'С.П.',
            title: '23 апреля — день рождения Сергея Прокофьева',
            className: 'is-beethoven',
            message: '«Танец рыцарей»: тяжёлый шаг Монтекки и Капулетти.',
            play: () => playNamedToneSequence(
                [
                    ['E2', 0.00, 0.24],
                    ['G2', 0.28, 0.24],
                    ['E2', 0.56, 0.24],
                    ['G2', 0.84, 0.38],
                    ['B2', 1.28, 0.20],
                    ['E3', 1.50, 0.24],
                    ['D#3', 1.78, 0.20],
                    ['C3', 2.02, 0.20],
                    ['B2', 2.26, 0.46]
                ],
                'sawtooth',
                0.035
            )
        },

        shostakovich: {
            aliases: [
                'SHOSTAKOVICH',
                'ШОСТАКОВИЧ'
            ],
            month: 8,
            day: 25,
            label: 'Д.Ш.',
            title: '25 сентября — день рождения Дмитрия Шостаковича',
            className: 'is-tchaikovsky',
            message: 'Вальс № 2. Слишком элегантно, чтобы быть случайностью.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.32],
                    ['Eb4', 0.34, 0.18],
                    ['D4', 0.54, 0.18],
                    ['C4', 0.74, 0.28],
                    ['C4', 1.04, 0.18],
                    ['D4', 1.24, 0.18],
                    ['Eb4', 1.44, 0.26],
                    ['C4', 1.72, 0.24],
                    ['Eb4', 1.98, 0.20],
                    ['G4', 2.20, 0.22],
                    ['Ab4', 2.44, 0.20],
                    ['G4', 2.66, 0.46]
                ],
                'triangle',
                0.045
            )
        },

        khachaturian: {
            aliases: [
                'KHACHATURIAN',
                'ХАЧАТУРЯН'
            ],
            month: 5,
            day: 6,
            label: 'А.Х.',
            title: '6 июня — день рождения Арама Хачатуряна',
            className: 'is-mission',
            message: '«Танец с саблями». Теперь главное — не уронить саблю на пюпитр.',
            play: () => playNamedToneSequence(
                [
                    ['B5', 0.00, 0.08],
                    ['B5', 0.09, 0.08],
                    ['B5', 0.18, 0.08],
                    ['B5', 0.27, 0.08],
                    ['Bb5', 0.38, 0.08],
                    ['B5', 0.47, 0.08],
                    ['B5', 0.56, 0.08],
                    ['B5', 0.65, 0.08],
                    ['Bb5', 0.76, 0.08],
                    ['B5', 0.85, 0.08],
                    ['B5', 0.94, 0.08],
                    ['B5', 1.03, 0.08],
                    ['Bb5', 1.14, 0.10],
                    ['A5', 1.26, 0.10],
                    ['Ab5', 1.38, 0.10],
                    ['G5', 1.50, 0.30]
                ],
                'square',
                0.027
            )
        },

        glinka: {
            aliases: [
                'GLINKA',
                'ГЛИНКА'
            ],
            month: 5,
            day: 1,
            label: 'М.Г.',
            title: '1 июня — день рождения Михаила Глинки',
            className: 'is-bach',
            message: '«Руслан и Людмила». Увертюра уже побежала вперёд.',
            play: () => playNamedToneSequence(
                [
                    ['C5', 0.00, 0.12],
                    ['E5', 0.13, 0.12],
                    ['F5', 0.26, 0.12],
                    ['G5', 0.39, 0.12],
                    ['A5', 0.52, 0.12],
                    ['G5', 0.65, 0.12],
                    ['F5', 0.78, 0.12],
                    ['E5', 0.91, 0.12],
                    ['D5', 1.04, 0.12],
                    ['C5', 1.17, 0.28]
                ],
                'triangle',
                0.043
            )
        },

        grieg: {
            aliases: [
                'GRIEG',
                'ГРИГ'
            ],
            month: 5,
            day: 15,
            label: 'EG',
            title: '15 июня — день рождения Эдварда Грига',
            className: 'is-mission',
            message: 'В пещере Горного короля кто-то начал ускоряться.',
            play: () => playNamedToneSequence(
                [
                    ['F#3', 0.00, 0.15],
                    ['G#3', 0.16, 0.15],
                    ['A#3', 0.32, 0.15],
                    ['B3', 0.48, 0.15],
                    ['C#4', 0.64, 0.18],
                    ['A#3', 0.84, 0.15],
                    ['C#4', 1.00, 0.28],
                    ['D4', 1.30, 0.18],
                    ['A#3', 1.50, 0.18],
                    ['D4', 1.70, 0.30]
                ],
                'triangle',
                0.042
            )
        },

        strauss: {
            aliases: [
                'JOHANNSTRAUSS',
                'STRAUSS',
                'ШТРАУС'
            ],
            month: 9,
            day: 25,
            label: 'JS',
            title: '25 октября — день рождения Иоганна Штрауса-младшего',
            className: 'is-tchaikovsky',
            message: '«На прекрасном голубом Дунае». Раз — два — три.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.22],
                    ['E4', 0.24, 0.22],
                    ['G4', 0.48, 0.36],
                    ['G4', 0.86, 0.18],
                    ['G4', 1.06, 0.18],
                    ['G4', 1.26, 0.24],
                    ['E4', 1.52, 0.20],
                    ['E4', 1.74, 0.24],
                    ['C4', 2.00, 0.20],
                    ['C4', 2.22, 0.42]
                ],
                'triangle',
                0.047
            )
        },

        saintsaens: {
            aliases: [
                'SAINTSAENS',
                'SAINT-SAENS',
                'СЕНСАНС',
                'СЕН-САНС'
            ],
            month: 9,
            day: 9,
            label: 'C-S',
            title: '9 октября — день рождения Камиля Сен-Санса',
            className: 'is-mission',
            message: 'Danse macabre. Полночь, скрипка и тритон.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.20],
                    ['Bb4', 0.22, 0.20],
                    ['G4', 0.44, 0.20],
                    ['A4', 0.66, 0.20],
                    ['Bb4', 0.88, 0.20],
                    ['A4', 1.10, 0.20],
                    ['Bb4', 1.32, 0.20],
                    ['A4', 1.54, 0.20],
                    ['Bb4', 1.76, 0.20],
                    ['A4', 1.98, 0.38]
                ],
                'sawtooth',
                0.027
            )
        },

        offenbach: {
            aliases: [
                'OFFENBACH',
                'ОФФЕНБАХ'
            ],
            month: 5,
            day: 20,
            label: 'JO',
            title: '20 июня — день рождения Жака Оффенбаха',
            className: 'is-mission',
            message: 'Can-can. Календарь внезапно стал немного быстрее.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.12],
                    ['D5', 0.13, 0.12],
                    ['D5', 0.26, 0.12],
                    ['E5', 0.39, 0.12],
                    ['D5', 0.52, 0.12],
                    ['C5', 0.65, 0.12],
                    ['C5', 0.78, 0.12],
                    ['E5', 0.91, 0.12],
                    ['F5', 1.04, 0.12],
                    ['A5', 1.17, 0.28]
                ],
                'square',
                0.030
            )
        },

        rachmaninoff: {
            aliases: [
                'RACHMANINOFF',
                'RACHMANINOV',
                'РАХМАНИНОВ'
            ],
            month: 3,
            day: 1,
            label: 'С.Р.',
            title: '1 апреля — день рождения Сергея Рахманинова',
            className: 'is-tchaikovsky',
            message: '«Вокализ». Без единого слова.',
            play: () => playNamedToneSequence(
                [
                    ['G5', 0.00, 0.42],
                    ['G5', 0.44, 0.24],
                    ['E5', 0.70, 0.38],
                    ['G5', 1.10, 0.30],
                    ['F#5', 1.42, 0.32],
                    ['F#5', 1.76, 0.22],
                    ['D5', 2.00, 0.34],
                    ['F#5', 2.36, 0.42],
                    ['E5', 2.80, 0.30],
                    ['E5', 3.12, 0.22],
                    ['C5', 3.36, 0.34],
                    ['E5', 3.72, 0.50]
                ],
                'sine',
                0.052
            )
        },

        handel: {
            aliases: ["HANDEL","HAENDEL","ГЕНДЕЛЬ"],
            month: 1,
            day: 23,
            label: "GFH",
            title: "23 февраля — день рождения Георга Фридриха Генделя",
            className: "is-beethoven",
            message: "Hallelujah. Тут даже календарь просит tutti.",
            play: () => playSimpleNamedMelody(
                ["C4","G4","A4","G4","C4","G4","A4","G4","C5","C5","B4","A4","G4","C5"],
                0.23,
                0.18,
                "triangle",
                0.048
            )
        },

        corelli: {
            aliases: ["CORELLI","КОРЕЛЛИ"],
            month: 1,
            day: 17,
            label: "AC",
            title: "17 февраля — день рождения Арканджело Корелли",
            className: "is-bach",
            message: "Corelli, La Folia. Бас всё помнит.",
            play: () => playSimpleNamedMelody(
                ["D3","A3","D3","C3","F3","C3","D3","A2","D3","A3","D3","C3","F3","C3","D3","A2"],
                0.28,
                0.22,
                "sine",
                0.05
            )
        },

        purcell: {
            aliases: ["PURCELL","ПЕРСЕЛЛ","ПЁРСЕЛЛ"],
            month: 8,
            day: 10,
            label: "HP",
            title: "10 сентября — традиционно указываемая дата рождения Генри Пёрселла",
            className: "is-tchaikovsky",
            message: "Dido’s Lament. Ground bass медленно опускается вниз.",
            play: () => playSimpleNamedMelody(
                ["G3","F#3","F3","E3","Eb3","D3","C#3","D3","G3","F#3","F3","E3","Eb3","D3","C#3","D3"],
                0.3,
                0.25,
                "sine",
                0.052
            )
        },

        scarlatti: {
            aliases: ["SCARLATTI","СКАРЛАТТИ"],
            month: 9,
            day: 26,
            label: "DS",
            title: "26 октября — день рождения Доменико Скарлатти",
            className: "is-mission",
            message: "K.141. Клавесин уже превратился в ударный инструмент.",
            play: () => playSimpleNamedMelody(
                ["D5","D5","D5","D5","D5","D5","D5","D5","C#5","D5","E5","F5","E5","D5","C#5","D5"],
                0.095,
                0.075,
                "square",
                0.027
            )
        },

        haydn: {
            aliases: ["HAYDN","ГАЙДН"],
            month: 2,
            day: 31,
            label: "JH",
            title: "31 марта — день рождения Йозефа Гайдна",
            className: "is-bach",
            message: "Симфония №45 «Прощальная». Пора по одному гасить свечи.",
            play: () => playSimpleNamedMelody(
                ["G4","E4","C4","B3","G3","D4","C4","B3","G3","D4","C4","G3","E3","C3"],
                0.27,
                0.22,
                "triangle",
                0.046
            )
        },

        schubert: {
            aliases: ["SCHUBERT","ШУБЕРТ"],
            month: 0,
            day: 31,
            label: "FS",
            title: "31 января — день рождения Франца Шуберта",
            className: "is-tchaikovsky",
            message: "Неоконченная симфония. Пасхалку, впрочем, мы закончили.",
            play: () => playSimpleNamedMelody(
                ["A4","B4","C5","A4","G4","E4","F4","C4","B3","E4","A4","B4","C5","A4"],
                0.25,
                0.2,
                "sine",
                0.05
            )
        },

        mendelssohn: {
            aliases: ["MENDELSSOHN","MENDELSON","МЕНДЕЛЬСОН"],
            month: 1,
            day: 3,
            label: "FM",
            title: "3 февраля — день рождения Феликса Мендельсона",
            className: "is-tchaikovsky",
            message: "Скрипичный концерт ми минор. Солист вступает почти сразу.",
            play: () => playSimpleNamedMelody(
                ["B4","B4","B4","G4","E5","E5","B5","G5","F#5","E5","C5","E5","B4"],
                0.24,
                0.2,
                "triangle",
                0.05
            )
        },

        chopin: {
            aliases: ["CHOPIN","ШОПЕН"],
            month: 2,
            day: 1,
            label: "FC",
            title: "1 марта — традиционно отмечаемый день рождения Фридерика Шопена",
            className: "is-tchaikovsky",
            message: "Траурный марш. Просьба не превращать календарь в катафалк.",
            play: () => playSimpleNamedMelody(
                ["Bb3","Bb3","Bb3","Bb3","Db4","C4","C4","Bb3","Bb3","Bb3","Bb3","Ab3","Bb3"],
                0.31,
                0.24,
                "sine",
                0.052
            )
        },

        liszt: {
            aliases: ["LISZT","ЛИСТ"],
            month: 9,
            day: 22,
            label: "FL",
            title: "22 октября — день рождения Ференца Листа",
            className: "is-mission",
            message: "Венгерская рапсодия №2. Пальцы уже пожалели о решении.",
            play: () => playSimpleNamedMelody(
                ["G4","B4","E5","D5","C5","B4","Bb4","A4","Ab4","G4","F#4","G4","A4","B4"],
                0.14,
                0.11,
                "triangle",
                0.044
            )
        },

        brahms: {
            aliases: ["BRAHMS","БРАМС"],
            month: 4,
            day: 7,
            label: "JB",
            title: "7 мая — день рождения Иоганнеса Брамса",
            className: "is-beethoven",
            message: "Венгерский танец №5. Темп опять решил пожить своей жизнью.",
            play: () => playSimpleNamedMelody(
                ["E4","A4","C5","A4","Ab4","A4","B4","A4","F4","G4","A4","E4","E4","A4","C5","B4"],
                0.2,
                0.16,
                "triangle",
                0.048
            )
        },

        dvorak: {
            aliases: ["DVORAK","DVOŘÁK","ДВОРЖАК"],
            month: 8,
            day: 8,
            label: "AD",
            title: "8 сентября — день рождения Антонина Дворжака",
            className: "is-beethoven",
            message: "«Из Нового Света», финал. Медь уже всё поняла.",
            play: () => playSimpleNamedMelody(
                ["E4","F#4","G4","F#4","E4","E4","E4","D4","B3","D4","E4","F#4","G4","A4"],
                0.25,
                0.2,
                "sawtooth",
                0.03
            )
        },

        mahler: {
            aliases: ["MAHLER","МАЛЕР"],
            month: 6,
            day: 7,
            label: "GM",
            title: "7 июля — день рождения Густава Малера",
            className: "is-beethoven",
            message: "Симфония №5. Труба объявила: шутки закончились.",
            play: () => playSimpleNamedMelody(
                ["C#5","C#5","C#5","C#5","B4","C#5","D5","C#5","B4","A4","G#4","C#5"],
                0.26,
                0.18,
                "sawtooth",
                0.032
            )
        },

        sibelius: {
            aliases: ["SIBELIUS","СИБЕЛИУС"],
            month: 11,
            day: 8,
            label: "JS",
            title: "8 декабря — день рождения Яна Сибелиуса",
            className: "is-tchaikovsky",
            message: "Скрипичный концерт. Туман, тремоло — и солист остаётся один.",
            play: () => playSimpleNamedMelody(
                ["G4","A4","D5","C5","Bb4","A4","G4","F4","E4","D4","E4","F4"],
                0.28,
                0.23,
                "sine",
                0.05
            )
        },

        debussy: {
            aliases: ["DEBUSSY","ДЕБЮССИ"],
            month: 7,
            day: 22,
            label: "CD",
            title: "22 августа — день рождения Клода Дебюсси",
            className: "is-tchaikovsky",
            message: "Clair de lune. Календарь временно освещён луной.",
            play: () => playSimpleNamedMelody(
                ["G4","G4","E4","D4","E4","D4","C4","D4","C4","E4","C4","G3","A3","C4"],
                0.31,
                0.27,
                "sine",
                0.048
            )
        },

        ravel: {
            aliases: ["RAVEL","РАВЕЛЬ"],
            month: 2,
            day: 7,
            label: "MR",
            title: "7 марта — день рождения Мориса Равеля",
            className: "is-mission",
            message: "Boléro. Осторожно: дальше будет только громче.",
            play: () => playSimpleNamedMelody(
                ["C5","B4","C5","D5","C5","B4","A4","C5","C5","A4","B4","C5","D5","C5"],
                0.24,
                0.19,
                "triangle",
                0.045
            )
        },

        elgar: {
            aliases: ["ELGAR","ЭЛГАР"],
            month: 5,
            day: 2,
            label: "EE",
            title: "2 июня — день рождения Эдварда Элгара",
            className: "is-tchaikovsky",
            message: "Nimrod. На несколько секунд всё стало очень серьёзно.",
            play: () => playSimpleNamedMelody(
                ["G4","Eb4","Ab4","F4","Bb4","F4","F4","Ab4","G4","Bb4","Eb4","F4","G4","Ab4"],
                0.32,
                0.28,
                "sine",
                0.052
            )
        },

        holst: {
            aliases: ["HOLST","ХОЛСТ"],
            month: 8,
            day: 21,
            label: "GH",
            title: "21 сентября — день рождения Густава Холста",
            className: "is-mission",
            message: "Mars. Пять четвертей снова пришли без приглашения.",
            play: () => playSimpleNamedMelody(
                ["G3","D4","C#4","Ab3","G3","G3","D4","C#4","Ab3","G3"],
                0.3,
                0.2,
                "sawtooth",
                0.03
            )
        },

        verdi: {
            aliases: ["VERDI","ВЕРДИ"],
            month: 9,
            day: 10,
            label: "GV",
            title: "10 октября — день рождения Джузеппе Верди",
            className: "is-beethoven",
            message: "Dies irae. Очень убедительная причина прийти на репетицию вовремя.",
            play: () => playSimpleNamedMelody(
                ["D4","D4","D4","D4","C#4","D4","F4","E4","D4","C4","Bb3","A3","D4","D4"],
                0.2,
                0.15,
                "sawtooth",
                0.034
            )
        },

        rossini: {
            aliases: ["ROSSINI","РОССИНИ"],
            month: 1,
            day: 29,
            label: "GR",
            title: "29 февраля — день рождения Джоаккино Россини",
            className: "is-mission",
            message: "Вильгельм Телль. Да, сейчас кто-нибудь обязательно поскачет.",
            play: () => playSimpleNamedMelody(
                ["G4","G4","G4","G4","G4","G4","G4","G4","C5","D5","E5","C5","G4","C5"],
                0.145,
                0.11,
                "triangle",
                0.045
            )
        },

        puccini: {
            aliases: ["PUCCINI","ПУЧЧИНИ"],
            month: 11,
            day: 22,
            label: "GP",
            title: "22 декабря — день рождения Джакомо Пуччини",
            className: "is-tchaikovsky",
            message: "Nessun dorma. Но после генеральной — пожалуйста.",
            play: () => playSimpleNamedMelody(
                ["D4","E4","F#4","E4","D4","E4","C#4","B3","E4","F#4","G4","A4","G4","F#4"],
                0.29,
                0.24,
                "sine",
                0.052
            )
        },

        paganini: {
            aliases: ["PAGANINI","ПАГАНИНИ"],
            month: 9,
            day: 27,
            label: "NP",
            title: "27 октября — день рождения Никколо Паганини",
            className: "is-mission",
            message: "Каприс №24. Левая рука уже требует профсоюз.",
            play: () => playSimpleNamedMelody(
                ["A4","A4","A4","B4","A4","C5","E5","E5","G#5","F#5","E5","A5"],
                0.19,
                0.14,
                "triangle",
                0.047
            )
        },

        sarasate: {
            aliases: ["SARASATE","САРАСАТЕ"],
            month: 2,
            day: 10,
            label: "PS",
            title: "10 марта — день рождения Пабло Сарасате",
            className: "is-tchaikovsky",
            message: "Zigeunerweisen. Смычок начинает подозревать неладное.",
            play: () => playSimpleNamedMelody(
                ["G4","C5","Eb5","G5","F5","Eb5","D5","C5","B4","C5","Eb5","D5","C5"],
                0.28,
                0.22,
                "triangle",
                0.05
            )
        },

        dukas: {
            aliases: ["DUKAS","ДЮКА"],
            month: 9,
            day: 1,
            label: "PD",
            title: "1 октября — день рождения Поля Дюка",
            className: "is-mission",
            message: "«Ученик чародея». Швабры пока не ожили.",
            play: () => playSimpleNamedMelody(
                ["A4","E5","E5","F#5","Ab5","A5","C6","A5","C6","B5","G#5","A5"],
                0.22,
                0.17,
                "triangle",
                0.046
            )
        },

        faure: {
            aliases: ["FAURE","FAURÉ","ФОРЕ"],
            month: 4,
            day: 12,
            label: "GF",
            title: "12 мая — день рождения Габриэля Форе",
            className: "is-tchaikovsky",
            message: "Pavane. Репетиция внезапно научилась ходить очень изящно.",
            play: () => playSimpleNamedMelody(
                ["C#5","B4","A4","G#4","A4","B4","C#5","E5","D5","C#5","B4","A4","G#4","A4"],
                0.3,
                0.25,
                "sine",
                0.05
            )
        },

        monteverdi: {
            aliases: ["MONTEVERDI","МОНТЕВЕРДИ"],
            month: 4,
            day: 15,
            label: "CM",
            title: "15 мая — день рождения Клаудио Монтеверди",
            className: "is-beethoven",
            message: "L’Orfeo: Toccata. Трубы объявляют открытие календаря.",
            play: () => playSimpleNamedMelody(
                ["C4","G4","C5","G4","C5","E5","D5","C5","G4","C5","E5","G5"],
                0.21,
                0.16,
                "sawtooth",
                0.031
            )
        },

        pachelbel: {
            aliases: ["PACHELBEL","ПАХЕЛЬБЕЛЬ"],
            label: "JP",
            title: "Иоганн Пахельбель — точная дата рождения не установлена",
            className: "is-bach",
            message: "Canon in D. Басовая формула снова пошла по кругу.",
            play: () => playSimpleNamedMelody(
                ["D3","A3","B3","F#3","G3","D3","G3","A3","D3","A3","B3","F#3","G3","D3","G3","A3"],
                0.27,
                0.22,
                "sine",
                0.048
            )
        },

        boccherini: {
            aliases: ["BOCCHERINI","БОККЕРИНИ"],
            month: 1,
            day: 19,
            label: "LB",
            title: "19 февраля — день рождения Луиджи Боккерини",
            className: "is-bach",
            message: "Менуэт Боккерини. Реверанс календарю.",
            play: () => playSimpleNamedMelody(
                ["C5","B4","C5","D5","C5","C5","E5","G5","G5","F5","F5","E5","D5","C5"],
                0.24,
                0.2,
                "triangle",
                0.047
            )
        },

        smetana: {
            aliases: ["SMETANA","СМЕТАНА"],
            month: 2,
            day: 2,
            label: "BS",
            title: "2 марта — день рождения Бедржиха Сметаны",
            className: "is-tchaikovsky",
            message: "Vltava. Река уже течёт через сетку календаря.",
            play: () => playSimpleNamedMelody(
                ["E4","F#4","G4","F#4","G4","A4","B4","E5","F#5","G5","F#5","G5","A5","B5"],
                0.23,
                0.19,
                "sine",
                0.05
            )
        },

        bruch: {
            aliases: ["BRUCH","БРУХ"],
            month: 0,
            day: 6,
            label: "MB",
            title: "6 января — день рождения Макса Бруха",
            className: "is-tchaikovsky",
            message: "Скрипичный концерт №1. Теперь скрипачи официально дома.",
            play: () => playSimpleNamedMelody(
                ["E5","D5","C5","E5","D5","C5","E5","A5","C6","E6","D6","C6","B5","A5"],
                0.27,
                0.22,
                "triangle",
                0.05
            )
        },

        glazunov: {
            aliases: ["GLAZUNOV","ГЛАЗУНОВ"],
            month: 7,
            day: 10,
            label: "AG",
            title: "10 августа — день рождения Александра Глазунова",
            className: "is-tchaikovsky",
            message: "Скрипичный концерт ля минор. Романтизм ещё не ушёл домой.",
            play: () => playSimpleNamedMelody(
                ["A4","B4","C5","B4","A4","G#4","A4","C5","B4","Bb4","A4","G4","F#4","E4"],
                0.28,
                0.23,
                "triangle",
                0.05
            )
        },

        albinoni: {
            aliases: [
                'ALBINONI',
                'АЛЬБИНОНИ'
            ],
            month: 5,
            day: 8,
            label: 'TA',
            title: '8 июня — день рождения Томазо Альбинони',
            className: 'is-tchaikovsky',
            message: 'Adagio соль минор. Да, то самое — традиционно приписываемое Альбинони.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.44],
                    ['F#4', 0.46, 0.28],
                    ['G4', 0.76, 0.36],
                    ['Bb4', 1.14, 0.42],
                    ['A4', 1.58, 0.30],
                    ['G4', 1.90, 0.38],
                    ['F4', 2.30, 0.30],
                    ['Eb4', 2.62, 0.42],
                    ['D4', 3.06, 0.34],
                    ['G4', 3.42, 0.52]
                ],
                'sine',
                0.052
            )
        },

        telemann: {
            aliases: [
                'TELEMANN',
                'ТЕЛЕМАН',
                'ТЕЛЕМАНН'
            ],
            month: 2,
            day: 14,
            label: 'GPT',
            title: '14 марта — день рождения Георга Филиппа Телемана',
            className: 'is-bach',
            message: 'Концерт для альта соль мажор. Альтисты дождались своей пасхалки.',
            play: () => playNamedToneSequence(
                [
                    ['G3', 0.00, 0.36],
                    ['B3', 0.38, 0.22],
                    ['D4', 0.62, 0.34],
                    ['C4', 0.98, 0.20],
                    ['B3', 1.20, 0.28],
                    ['A3', 1.50, 0.22],
                    ['G3', 1.74, 0.38],
                    ['D4', 2.14, 0.28],
                    ['E4', 2.44, 0.20],
                    ['F#4', 2.66, 0.20],
                    ['G4', 2.88, 0.48]
                ],
                'triangle',
                0.050
            )
        },

        tartini: {
            aliases: [
                'TARTINI',
                'ТАРТИНИ'
            ],
            month: 3,
            day: 8,
            label: 'GT',
            title: '8 апреля — день рождения Джузеппе Тартини',
            className: 'is-mission',
            message: '«Дьявольская трель». Без договора с дьяволом — только музыка.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.30],
                    ['A5', 0.32, 0.20],
                    ['D6', 0.54, 0.34],
                    ['C#6', 0.90, 0.14],
                    ['D6', 1.06, 0.14],
                    ['C#6', 1.22, 0.14],
                    ['D6', 1.38, 0.14],
                    ['E6', 1.56, 0.22],
                    ['F6', 1.80, 0.20],
                    ['E6', 2.02, 0.18],
                    ['D6', 2.22, 0.20],
                    ['C#6', 2.44, 0.18],
                    ['D6', 2.64, 0.42]
                ],
                'triangle',
                0.050
            )
        },

        locatelli: {
            aliases: [
                'LOCATELLI',
                'ЛОКАТЕЛЛИ'
            ],
            month: 8,
            day: 3,
            label: 'PL',
            title: '3 сентября — день рождения Пьетро Локателли',
            className: 'is-mission',
            message: 'Il Labirinto Armonico. Выход из лабиринта — через ещё один пассаж.',
            play: () => playNamedToneSequence(
                [
                    ['E5', 0.00, 0.11],
                    ['F#5', 0.12, 0.11],
                    ['G5', 0.24, 0.11],
                    ['A5', 0.36, 0.11],
                    ['B5', 0.48, 0.11],
                    ['C6', 0.60, 0.11],
                    ['D6', 0.72, 0.11],
                    ['E6', 0.84, 0.16],
                    ['D6', 1.02, 0.11],
                    ['C6', 1.14, 0.11],
                    ['B5', 1.26, 0.11],
                    ['A5', 1.38, 0.11],
                    ['G5', 1.50, 0.11],
                    ['F#5', 1.62, 0.11],
                    ['E5', 1.74, 0.28]
                ],
                'triangle',
                0.049
            )
        },

        sammartini: {
            aliases: [
                'SAMMARTINI',
                'САММАРТИНИ'
            ],
            label: 'GBS',
            title: 'Джованни Баттиста Саммартини — точная дата рождения неизвестна',
            className: 'is-bach',
            message: 'Саммартини. Симфония ещё молодая, а проблемы с ансамблем уже знакомые.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.22],
                    ['G4', 0.24, 0.20],
                    ['C5', 0.46, 0.28],
                    ['E5', 0.76, 0.20],
                    ['D5', 0.98, 0.18],
                    ['C5', 1.18, 0.20],
                    ['B4', 1.40, 0.18],
                    ['A4', 1.60, 0.20],
                    ['G4', 1.82, 0.28],
                    ['C5', 2.12, 0.20],
                    ['B4', 2.34, 0.18],
                    ['A4', 2.54, 0.34],
                    ['G4', 2.90, 0.46]
                ],
                'triangle',
                0.049
            )
        },

        pergolesi: {
            aliases: [
                'PERGOLESI',
                'ПЕРГОЛЕЗИ'
            ],
            month: 0,
            day: 4,
            label: 'GBP',
            title: '4 января — день рождения Джованни Баттиста Перголези',
            className: 'is-tchaikovsky',
            message: 'Stabat Mater. На несколько секунд стало очень тихо и серьёзно.',
            play: () => playNamedToneSequence(
                [
                    ['F4', 0.00, 0.40],
                    ['G4', 0.42, 0.26],
                    ['Ab4', 0.70, 0.36],
                    ['G4', 1.08, 0.26],
                    ['F4', 1.36, 0.34],
                    ['Eb4', 1.72, 0.30],
                    ['D4', 2.04, 0.30],
                    ['C4', 2.36, 0.38],
                    ['D4', 2.76, 0.26],
                    ['Eb4', 3.04, 0.28],
                    ['F4', 3.34, 0.46]
                ],
                'sine',
                0.052
            )
        },

        lully: {
            aliases: [
                'LULLY',
                'ЛЮЛЛИ'
            ],
            month: 10,
            day: 28,
            label: 'JBL',
            title: '28 ноября — день рождения Жан-Батиста Люлли',
            className: 'is-beethoven',
            message: 'Marche pour la cérémonie des Turcs. Дирижёрская трость сегодня особенно опасна.',
            play: () => playNamedToneSequence(
                [
                    ['D4', 0.00, 0.22],
                    ['D4', 0.24, 0.22],
                    ['A4', 0.48, 0.28],
                    ['A4', 0.78, 0.18],
                    ['D5', 0.98, 0.28],
                    ['E5', 1.28, 0.18],
                    ['F#5', 1.48, 0.24],
                    ['E5', 1.74, 0.18],
                    ['D5', 1.94, 0.24],
                    ['C#5', 2.20, 0.18],
                    ['B4', 2.40, 0.20],
                    ['A4', 2.62, 0.40]
                ],
                'sawtooth',
                0.040
            )
        },

        rameau: {
            aliases: [
                'RAMEAU',
                'РАМО'
            ],
            month: 8,
            day: 25,
            label: 'JPR',
            title: '25 сентября — день рождения Жан-Филиппа Рамо',
            className: 'is-bach',
            message: 'Les Sauvages. Французское барокко проснулось.',
            play: () => playNamedToneSequence(
                [
                    ['D4', 0.00, 0.18],
                    ['D4', 0.20, 0.18],
                    ['E4', 0.40, 0.18],
                    ['F4', 0.60, 0.22],
                    ['E4', 0.84, 0.18],
                    ['D4', 1.04, 0.18],
                    ['C4', 1.24, 0.22],
                    ['D4', 1.48, 0.18],
                    ['E4', 1.68, 0.18],
                    ['F4', 1.88, 0.22],
                    ['G4', 2.12, 0.20],
                    ['F4', 2.34, 0.18],
                    ['E4', 2.54, 0.18],
                    ['D4', 2.74, 0.38]
                ],
                'triangle',
                0.050
            )
        },

        couperin: {
            aliases: [
                'COUPERIN',
                'КУПЕРЕН'
            ],
            month: 10,
            day: 10,
            label: 'FC',
            title: '10 ноября — день рождения Франсуа Куперена',
            className: 'is-bach',
            message: 'Les Barricades Mystérieuses. Баррикады есть, разгадки по-прежнему нет.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.24],
                    ['E4', 0.26, 0.22],
                    ['G4', 0.50, 0.24],
                    ['B4', 0.76, 0.28],
                    ['A4', 1.06, 0.22],
                    ['G4', 1.30, 0.22],
                    ['F4', 1.54, 0.22],
                    ['E4', 1.78, 0.24],
                    ['D4', 2.04, 0.22],
                    ['F4', 2.28, 0.22],
                    ['A4', 2.52, 0.24],
                    ['G4', 2.78, 0.38]
                ],
                'sine',
                0.051
            )
        },

        buxtehude: {
            aliases: [
                'BUXTEHUDE',
                'БУКСТЕХУДЕ'
            ],
            label: 'DB',
            title: 'Дитрих Букстехуде — точная дата рождения неизвестна',
            className: 'is-bach',
            message: 'Passacaglia ре минор. Остинато держится крепче расписания.',
            play: () => playNamedToneSequence(
                [
                    ['D4', 0.00, 0.30],
                    ['C4', 0.32, 0.28],
                    ['Bb3', 0.62, 0.28],
                    ['A3', 0.92, 0.28],
                    ['G3', 1.22, 0.28],
                    ['A3', 1.52, 0.28],
                    ['Bb3', 1.82, 0.28],
                    ['C4', 2.12, 0.28],
                    ['D4', 2.42, 0.30],
                    ['C4', 2.74, 0.28],
                    ['Bb3', 3.04, 0.28],
                    ['A3', 3.34, 0.42]
                ],
                'triangle',
                0.060
            )
        },

        cpebach: {
            aliases: [
                'CPEBACH',
                'CARLPHILIPPEMANUELBACH',
                'КФЭБАХ',
                'КАРЛФИЛИППЭМАНУЭЛЬБАХ'
            ],
            month: 2,
            day: 8,
            label: 'CPE',
            title: '8 марта — день рождения Карла Филиппа Эмануэля Баха',
            className: 'is-bach',
            message: 'Solfeggietto. Бах — но уже гораздо нервнее.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.10],
                    ['Eb4', 0.11, 0.10],
                    ['G4', 0.22, 0.10],
                    ['C5', 0.33, 0.10],
                    ['Eb5', 0.44, 0.10],
                    ['D5', 0.55, 0.10],
                    ['C5', 0.66, 0.10],
                    ['B4', 0.77, 0.10],
                    ['Ab4', 0.88, 0.10],
                    ['G4', 0.99, 0.10],
                    ['F4', 1.10, 0.10],
                    ['Eb4', 1.21, 0.10],
                    ['D4', 1.32, 0.10],
                    ['C4', 1.43, 0.26]
                ],
                'triangle',
                0.058
            )
        },

        gluck: {
            aliases: [
                'GLUCK',
                'ГЛЮК'
            ],
            month: 6,
            day: 2,
            label: 'CWG',
            title: '2 июля — день рождения Кристофа Виллибальда Глюка',
            className: 'is-tchaikovsky',
            message: 'Dance of the Blessed Spirits. Флейта просит тишины.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.34],
                    ['E4', 0.36, 0.26],
                    ['F4', 0.64, 0.26],
                    ['G4', 0.92, 0.34],
                    ['C5', 1.28, 0.30],
                    ['C5', 1.60, 0.24],
                    ['B4', 1.86, 0.24],
                    ['A4', 2.12, 0.24],
                    ['G4', 2.38, 0.28],
                    ['A4', 2.68, 0.42]
                ],
                'sine',
                0.062
            )
        },

        cherubini: {
            aliases: [
                'CHERUBINI',
                'КЕРУБИНИ'
            ],
            month: 8,
            day: 14,
            label: 'LC',
            title: '14 сентября — день рождения Луиджи Керубини',
            className: 'is-tchaikovsky',
            message: 'Ave Maria. Керубини умеет делать тишину очень напряжённой.',
            play: () => playNamedToneSequence(
                [
                    ['F4', 0.00, 0.28],
                    ['G4', 0.30, 0.24],
                    ['A4', 0.56, 0.28],
                    ['Bb4', 0.86, 0.34],
                    ['C5', 1.22, 0.28],
                    ['D5', 1.52, 0.30],
                    ['C5', 1.84, 0.24],
                    ['Bb4', 2.10, 0.24],
                    ['A4', 2.36, 0.28],
                    ['C5', 2.66, 0.44]
                ],
                'sine',
                0.061
            )
        },

        weber: {
            aliases: [
                'WEBER',
                'ВЕБЕР'
            ],
            label: 'CMW',
            title: 'Карл Мария фон Вебер — дата рождения обычно указывается как 18 или 19 ноября 1786 года',
            className: 'is-beethoven',
            message: 'Der Freischütz. Валторны уже вышли из леса.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.34],
                    ['E4', 0.36, 0.26],
                    ['C4', 0.64, 0.34],
                    ['E4', 1.00, 0.24],
                    ['D4', 1.26, 0.24],
                    ['E4', 1.52, 0.24],
                    ['D4', 1.78, 0.24],
                    ['E4', 2.04, 0.24],
                    ['C4', 2.30, 0.28],
                    ['E4', 2.60, 0.24],
                    ['G4', 2.86, 0.34],
                    ['G4', 3.22, 0.24],
                    ['F4', 3.48, 0.22],
                    ['D4', 3.72, 0.40]
                ],
                'sawtooth',
                0.054
            )
        },

        bellini: {
            aliases: [
                'BELLINI',
                'БЕЛЛИНИ'
            ],
            month: 10,
            day: 3,
            label: 'VB',
            title: '3 ноября — день рождения Винченцо Беллини',
            className: 'is-tchaikovsky',
            message: 'Casta Diva. Белканто теперь прячется и в календаре.',
            play: () => playNamedToneSequence(
                [
                    ['B4', 0.00, 0.30],
                    ['B4', 0.32, 0.24],
                    ['C5', 0.58, 0.28],
                    ['B4', 0.88, 0.26],
                    ['A4', 1.16, 0.30],
                    ['B4', 1.48, 0.28],
                    ['D5', 1.78, 0.34],
                    ['C5', 2.14, 0.28],
                    ['B4', 2.44, 0.26],
                    ['A4', 2.72, 0.24],
                    ['A4', 2.98, 0.22],
                    ['G4', 3.22, 0.24],
                    ['B4', 3.48, 0.24],
                    ['A4', 3.74, 0.22],
                    ['G4', 3.98, 0.42]
                ],
                'sine',
                0.062
            )
        },

        donizetti: {
            aliases: [
                'DONIZETTI',
                'ДОНИЦЕТТИ'
            ],
            month: 10,
            day: 29,
            label: 'GD',
            title: '29 ноября — день рождения Гаэтано Доницетти',
            className: 'is-tchaikovsky',
            message: 'Una furtiva lagrima. Одна тайная слеза засчитана.',
            play: () => playNamedToneSequence(
                [
                    ['D4', 0.00, 0.28],
                    ['G4', 0.30, 0.28],
                    ['G4', 0.60, 0.22],
                    ['G4', 0.84, 0.22],
                    ['G4', 1.08, 0.22],
                    ['G4', 1.32, 0.28],
                    ['F#4', 1.62, 0.26],
                    ['A4', 1.90, 0.34],
                    ['Eb4', 2.26, 0.28],
                    ['A4', 2.56, 0.26],
                    ['A4', 2.84, 0.24],
                    ['C5', 3.10, 0.28],
                    ['Bb4', 3.40, 0.44]
                ],
                'sine',
                0.062
            )
        },

        meyerbeer: {
            aliases: [
                'MEYERBEER',
                'МЕЙЕРБЕР'
            ],
            month: 8,
            day: 5,
            label: 'GM',
            title: '5 сентября — день рождения Джакомо Мейербера',
            className: 'is-beethoven',
            message: 'Coronation March из Le prophète. Торжественность включена.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.24],
                    ['B3', 0.26, 0.20],
                    ['C4', 0.48, 0.22],
                    ['D4', 0.72, 0.22],
                    ['E4', 0.96, 0.30],
                    ['C4', 1.28, 0.26],
                    ['F4', 1.56, 0.30],
                    ['E4', 1.88, 0.24],
                    ['D4', 2.14, 0.24],
                    ['E4', 2.40, 0.42]
                ],
                'sawtooth',
                0.054
            )
        },

        berlioz: {
            aliases: [
                'BERLIOZ',
                'БЕРЛИОЗ'
            ],
            month: 11,
            day: 11,
            label: 'HB',
            title: '11 декабря — день рождения Гектора Берлиоза',
            className: 'is-beethoven',
            message: 'Symphonie fantastique: idée fixe. Навязчивая тема найдена.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.20],
                    ['G4', 0.22, 0.18],
                    ['C5', 0.42, 0.30],
                    ['G4', 0.74, 0.22],
                    ['E4', 0.98, 0.22],
                    ['E4', 1.22, 0.20],
                    ['F4', 1.44, 0.22],
                    ['E4', 1.68, 0.20],
                    ['E4', 1.90, 0.20],
                    ['D4', 2.12, 0.36]
                ],
                'triangle',
                0.060
            )
        },

        gounod: {
            aliases: [
                'GOUNOD',
                'ГУНО'
            ],
            month: 5,
            day: 17,
            label: 'CG',
            title: '17 июня — день рождения Шарля Гуно',
            className: 'is-tchaikovsky',
            message: 'Faust. Вальсовое движение уже закрутилось.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.24],
                    ['E4', 0.26, 0.22],
                    ['A4', 0.50, 0.28],
                    ['F#4', 0.80, 0.24],
                    ['G4', 1.06, 0.24],
                    ['E4', 1.32, 0.22],
                    ['A4', 1.56, 0.28],
                    ['F#4', 1.86, 0.24],
                    ['G4', 2.12, 0.28],
                    ['E4', 2.42, 0.38]
                ],
                'triangle',
                0.060
            )
        },

        massenet: {
            aliases: [
                'MASSENET',
                'МАССНЕ'
            ],
            month: 4,
            day: 12,
            label: 'JM',
            title: '12 мая — день рождения Жюля Массне',
            className: 'is-tchaikovsky',
            message: 'Méditation из Thaïs. Скрипачи, это вам.',
            play: () => playNamedToneSequence(
                [
                    ['E5', 0.00, 0.34],
                    ['C5', 0.36, 0.26],
                    ['G5', 0.64, 0.38],
                    ['C6', 1.04, 0.34],
                    ['E6', 1.40, 0.30],
                    ['A5', 1.72, 0.28],
                    ['B5', 2.02, 0.28],
                    ['C6', 2.32, 0.30],
                    ['C6', 2.64, 0.26],
                    ['D6', 2.92, 0.42]
                ],
                'sine',
                0.062
            )
        },

        lalo: {
            aliases: [
                'LALO',
                'ЛАЛО'
            ],
            month: 0,
            day: 27,
            label: 'EL',
            title: '27 января — день рождения Эдуара Лало',
            className: 'is-tchaikovsky',
            message: 'Symphonie espagnole. Французская музыка внезапно заговорила по-испански.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.24],
                    ['A5', 0.26, 0.22],
                    ['F#5', 0.50, 0.22],
                    ['D5', 0.74, 0.24],
                    ['E5', 1.00, 0.20],
                    ['F#5', 1.22, 0.22],
                    ['G5', 1.46, 0.22],
                    ['A5', 1.70, 0.28],
                    ['B5', 2.00, 0.22],
                    ['A5', 2.24, 0.22],
                    ['G5', 2.48, 0.24],
                    ['F#5', 2.74, 0.38]
                ],
                'triangle',
                0.060
            )
        },

        franck: {
            aliases: [
                'FRANCK',
                'ФРАНК'
            ],
            month: 11,
            day: 10,
            label: 'CF',
            title: '10 декабря — день рождения Сезара Франка',
            className: 'is-tchaikovsky',
            message: 'Соната для скрипки и фортепиано. Циклическая форма замкнулась.',
            play: () => playNamedToneSequence(
                [
                    ['F#4', 0.00, 0.34],
                    ['A4', 0.36, 0.30],
                    ['C#5', 0.68, 0.40],
                    ['B4', 1.10, 0.26],
                    ['A4', 1.38, 0.28],
                    ['G#4', 1.68, 0.30],
                    ['F#4', 2.00, 0.34],
                    ['E4', 2.36, 0.28],
                    ['F#4', 2.66, 0.30],
                    ['A4', 2.98, 0.44]
                ],
                'sine',
                0.062
            )
        },

        chausson: {
            aliases: [
                'CHAUSSON',
                'ШОССОН'
            ],
            month: 0,
            day: 20,
            label: 'EC',
            title: '20 января — день рождения Эрнеста Шоссона',
            className: 'is-tchaikovsky',
            message: 'Poème. Название короткое, а фраза — совсем нет.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.34],
                    ['B4', 0.36, 0.28],
                    ['D5', 0.66, 0.40],
                    ['C#5', 1.08, 0.28],
                    ['B4', 1.38, 0.28],
                    ['A4', 1.68, 0.32],
                    ['G4', 2.02, 0.34],
                    ['F#4', 2.38, 0.28],
                    ['E4', 2.68, 0.30],
                    ['F#4', 3.00, 0.46]
                ],
                'sine',
                0.062
            )
        },

        lekeu: {
            aliases: [
                'LEKEU',
                'ЛЕКЁ',
                'ЛЕКЕ'
            ],
            month: 0,
            day: 20,
            label: 'GL',
            title: '20 января — день рождения Гийома Лекё',
            className: 'is-tchaikovsky',
            message: 'Соната для скрипки. Романтизм без всяких тормозов.',
            play: () => playNamedToneSequence(
                [
                    ['G3', 0.00, 0.34],
                    ['B3', 0.36, 0.28],
                    ['D4', 0.66, 0.38],
                    ['G4', 1.06, 0.32],
                    ['F#4', 1.40, 0.28],
                    ['E4', 1.70, 0.28],
                    ['D4', 2.00, 0.30],
                    ['C4', 2.32, 0.28],
                    ['B3', 2.62, 0.28],
                    ['A3', 2.92, 0.28],
                    ['G3', 3.22, 0.42]
                ],
                'sine',
                0.062
            )
        },

        vieuxtemps: {
            aliases: [
                'VIEUXTEMPS',
                'ВЬЁТАН',
                'ВЬЕТАН'
            ],
            month: 1,
            day: 17,
            label: 'HV',
            title: '17 февраля — день рождения Анри Вьётана',
            className: 'is-mission',
            message: 'Скрипичный концерт №5. Ещё одна причина не бросать гаммы.',
            play: () => playNamedToneSequence(
                [
                    ['A4', 0.00, 0.22],
                    ['E5', 0.24, 0.20],
                    ['C#5', 0.46, 0.20],
                    ['A4', 0.68, 0.24],
                    ['B4', 0.94, 0.20],
                    ['C#5', 1.16, 0.20],
                    ['D5', 1.38, 0.22],
                    ['E5', 1.62, 0.24],
                    ['F#5', 1.88, 0.20],
                    ['E5', 2.10, 0.20],
                    ['D5', 2.32, 0.22],
                    ['C#5', 2.56, 0.38]
                ],
                'triangle',
                0.061
            )
        },

        wieniawski: {
            aliases: [
                'WIENIAWSKI',
                'ВЕНЯВСКИЙ'
            ],
            month: 6,
            day: 10,
            label: 'HW',
            title: '10 июля — день рождения Генрика Венявского',
            className: 'is-mission',
            message: 'Скрипичный концерт №2. Скрипичный заговор продолжается.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.24],
                    ['F5', 0.26, 0.22],
                    ['A5', 0.50, 0.28],
                    ['G5', 0.80, 0.22],
                    ['F5', 1.04, 0.22],
                    ['E5', 1.28, 0.22],
                    ['D5', 1.52, 0.26],
                    ['C#5', 1.80, 0.20],
                    ['D5', 2.02, 0.24],
                    ['A4', 2.28, 0.22],
                    ['D5', 2.52, 0.24],
                    ['F5', 2.78, 0.42]
                ],
                'triangle',
                0.061
            )
        },

        ysaye: {
            aliases: [
                'YSAYE',
                'YSAŸE',
                'ИЗАИ'
            ],
            month: 6,
            day: 16,
            label: 'EY',
            title: '16 июля — день рождения Эжена Изаи',
            className: 'is-mission',
            message: 'Соната №3 «Баллада». Одна скрипка, а проблем как у оркестра.',
            play: () => playNamedToneSequence(
                [
                    ['G3', 0.00, 0.24],
                    ['D4', 0.26, 0.22],
                    ['Bb4', 0.50, 0.28],
                    ['A4', 0.80, 0.20],
                    ['G4', 1.02, 0.20],
                    ['F#4', 1.24, 0.22],
                    ['G4', 1.48, 0.24],
                    ['D5', 1.74, 0.22],
                    ['C5', 1.98, 0.20],
                    ['Bb4', 2.20, 0.22],
                    ['A4', 2.44, 0.20],
                    ['G4', 2.66, 0.40]
                ],
                'triangle',
                0.061
            )
        },

        kreisler: {
            aliases: [
                'KREISLER',
                'КРЕЙСЛЕР'
            ],
            month: 1,
            day: 2,
            label: 'FK',
            title: '2 февраля — день рождения Фрица Крейслера',
            className: 'is-tchaikovsky',
            message: 'Liebesleid. Любовные страдания в тональности календаря.',
            play: () => playNamedToneSequence(
                [
                    ['E4', 0.00, 0.30],
                    ['A4', 0.32, 0.30],
                    ['E4', 0.64, 0.22],
                    ['E4', 0.88, 0.22],
                    ['E4', 1.12, 0.22],
                    ['E4', 1.36, 0.24],
                    ['D4', 1.62, 0.24],
                    ['E4', 1.88, 0.26],
                    ['F4', 2.16, 0.26],
                    ['G4', 2.44, 0.30],
                    ['D4', 2.76, 0.42]
                ],
                'sine',
                0.062
            )
        },

        rode: {
            aliases: [
                'RODE',
                'РОДЕ'
            ],
            month: 1,
            day: 16,
            label: 'PR',
            title: '16 февраля — день рождения Пьера Роде',
            className: 'is-mission',
            message: 'Каприс №24. Этюды тоже умеют прятаться.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.16],
                    ['E5', 0.18, 0.16],
                    ['F#5', 0.36, 0.16],
                    ['G5', 0.54, 0.16],
                    ['A5', 0.72, 0.16],
                    ['B5', 0.90, 0.16],
                    ['C#6', 1.08, 0.16],
                    ['D6', 1.26, 0.22],
                    ['C#6', 1.50, 0.16],
                    ['B5', 1.68, 0.16],
                    ['A5', 1.86, 0.16],
                    ['G5', 2.04, 0.28]
                ],
                'triangle',
                0.060
            )
        },

        spohr: {
            aliases: [
                'SPOHR',
                'ШПОР'
            ],
            month: 3,
            day: 5,
            label: 'LS',
            title: '5 апреля — день рождения Луи Шпора',
            className: 'is-tchaikovsky',
            message: 'Скрипичный концерт №8. Оперная сцена — только без певца.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.30],
                    ['B4', 0.32, 0.28],
                    ['D5', 0.62, 0.36],
                    ['C5', 1.00, 0.26],
                    ['B4', 1.28, 0.28],
                    ['A4', 1.58, 0.28],
                    ['G4', 1.88, 0.30],
                    ['D4', 2.20, 0.26],
                    ['G4', 2.48, 0.28],
                    ['A4', 2.78, 0.26],
                    ['B4', 3.06, 0.26],
                    ['C5', 3.34, 0.42]
                ],
                'sine',
                0.062
            )
        },

        schutz: {
            aliases: [
                'SCHUTZ',
                'SCHÜTZ',
                'ШЮТЦ'
            ],
            month: 9,
            day: 8,
            label: 'HS',
            title: '8 октября — день рождения Генриха Шютца',
            className: 'is-bach',
            message: 'Saul, Saul, was verfolgst du mich? Немецкое барокко включило эхо.',
            play: () => playNamedToneSequence(
                [
                    ['D4', 0.00, 0.26],
                    ['D4', 0.28, 0.22],
                    ['F4', 0.52, 0.28],
                    ['E4', 0.82, 0.22],
                    ['D4', 1.06, 0.28],
                    ['A4', 1.36, 0.30],
                    ['G4', 1.68, 0.24],
                    ['F4', 1.94, 0.24],
                    ['E4', 2.20, 0.24],
                    ['D4', 2.46, 0.40]
                ],
                'sine',
                0.061
            )
        },

        leopoldmozart: {
            aliases: [
                'LEOPOLDMOZART',
                'ЛЕОПОЛЬДМОЦАРТ'
            ],
            month: 10,
            day: 14,
            label: 'LM',
            title: '14 ноября — день рождения Леопольда Моцарта',
            className: 'is-bach',
            message: 'Sinfonia da caccia. Охотничьи сигналы добрались и до календаря.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.20],
                    ['G4', 0.22, 0.24],
                    ['C5', 0.48, 0.28],
                    ['E5', 0.78, 0.22],
                    ['G5', 1.02, 0.30],
                    ['E5', 1.34, 0.20],
                    ['C5', 1.56, 0.22],
                    ['G4', 1.80, 0.26],
                    ['C5', 2.08, 0.26],
                    ['G5', 2.36, 0.38]
                ],
                'sawtooth',
                0.053
            )
        },

        fibich: {
            aliases: [
                'FIBICH',
                'ФИБИХ'
            ],
            month: 11,
            day: 21,
            label: 'ZF',
            title: '21 декабря — день рождения Зденека Фибиха',
            className: 'is-tchaikovsky',
            message: 'Poème. Один из тех случаев, когда десяти нот уже достаточно.',
            play: () => playNamedToneSequence(
                [
                    ['C5', 0.00, 0.32],
                    ['B4', 0.34, 0.26],
                    ['E5', 0.62, 0.36],
                    ['G5', 1.00, 0.30],
                    ['A5', 1.32, 0.28],
                    ['Bb5', 1.62, 0.24],
                    ['Bb5', 1.88, 0.22],
                    ['A5', 2.12, 0.26],
                    ['G5', 2.40, 0.28],
                    ['F5', 2.70, 0.44]
                ],
                'sine',
                0.062
            )
        },

        svendsen: {
            aliases: [
                'SVENDSEN',
                'СВЕНДСЕН'
            ],
            month: 8,
            day: 30,
            label: 'JS',
            title: '30 сентября — день рождения Юхана Свенсена',
            className: 'is-tchaikovsky',
            message: 'Romance соль мажор. Скрипка снова получила всё самое певучее.',
            play: () => playNamedToneSequence(
                [
                    ['D5', 0.00, 0.34],
                    ['G5', 0.36, 0.30],
                    ['A5', 0.68, 0.28],
                    ['B5', 0.98, 0.34],
                    ['C6', 1.34, 0.28],
                    ['B5', 1.64, 0.28],
                    ['A5', 1.94, 0.30],
                    ['G5', 2.26, 0.34],
                    ['F#5', 2.62, 0.28],
                    ['E5', 2.92, 0.40]
                ],
                'sine',
                0.062
            )
        },

        nielsen: {
            aliases: [
                'NIELSEN',
                'НИЛЬСЕН'
            ],
            month: 5,
            day: 9,
            label: 'CN',
            title: '9 июня — день рождения Карла Нильсена',
            className: 'is-beethoven',
            message: 'Helios Overture. Солнце встало — медь тоже.',
            play: () => playNamedToneSequence(
                [
                    ['C4', 0.00, 0.34],
                    ['G4', 0.36, 0.30],
                    ['E4', 0.68, 0.28],
                    ['G4', 0.98, 0.30],
                    ['C5', 1.30, 0.34],
                    ['D5', 1.66, 0.26],
                    ['E5', 1.94, 0.28],
                    ['G5', 2.24, 0.32],
                    ['E5', 2.58, 0.28],
                    ['C5', 2.88, 0.42]
                ],
                'sawtooth',
                0.054
            )
        },

        bruckner: {
            aliases: [
                'BRUCKNER',
                'БРУКНЕР'
            ],
            month: 8,
            day: 4,
            label: 'AB',
            title: '4 сентября — день рождения Антона Брукнера',
            className: 'is-beethoven',
            message: 'Симфония №4 «Романтическая». Валторна открыла лес.',
            play: () => playNamedToneSequence(
                [
                    ['G3', 0.00, 0.34],
                    ['C4', 0.36, 0.30],
                    ['C4', 0.68, 0.24],
                    ['G4', 0.94, 0.30],
                    ['Ab4', 1.26, 0.26],
                    ['C5', 1.54, 0.30],
                    ['C5', 1.86, 0.24],
                    ['G4', 2.12, 0.28],
                    ['G4', 2.42, 0.24],
                    ['C5', 2.68, 0.40]
                ],
                'sawtooth',
                0.055
            )
        },

        mascagni: {
            aliases: [
                'MASCAGNI',
                'МАСКАНЬИ'
            ],
            month: 11,
            day: 7,
            label: 'PM',
            title: '7 декабря — день рождения Пьетро Масканьи',
            className: 'is-tchaikovsky',
            message: 'Intermezzo из Cavalleria rusticana. Всё внезапно стало кинематографичным.',
            play: () => playNamedToneSequence(
                [
                    ['E4', 0.00, 0.34],
                    ['G4', 0.36, 0.28],
                    ['C5', 0.66, 0.36],
                    ['E5', 1.04, 0.32],
                    ['A5', 1.38, 0.30],
                    ['A5', 1.70, 0.24],
                    ['G5', 1.96, 0.26],
                    ['F5', 2.24, 0.26],
                    ['C5', 2.52, 0.28],
                    ['E5', 2.82, 0.42]
                ],
                'sine',
                0.062
            )
        },

        leoncavallo: {
            aliases: [
                'LEONCAVALLO',
                'ЛЕОНКАВАЛЛО'
            ],
            month: 3,
            day: 23,
            label: 'RL',
            title: '23 апреля — день рождения Руджеро Леонкавалло',
            className: 'is-tchaikovsky',
            message: 'Vesti la giubba. Клоун улыбается, музыка — совсем нет.',
            play: () => playNamedToneSequence(
                [
                    ['G4', 0.00, 0.32],
                    ['A4', 0.34, 0.26],
                    ['Bb4', 0.62, 0.28],
                    ['C5', 0.92, 0.32],
                    ['D5', 1.26, 0.28],
                    ['C5', 1.56, 0.28],
                    ['Bb4', 1.86, 0.28],
                    ['A4', 2.16, 0.28],
                    ['G4', 2.46, 0.30],
                    ['F4', 2.78, 0.40]
                ],
                'sine',
                0.062
            )
        },

        cilea: {
            aliases: [
                'CILEA',
                'ЧИЛЕА'
            ],
            month: 6,
            day: 23,
            label: 'FC',
            title: '23 июля — день рождения Франческо Чилеа',
            className: 'is-tchaikovsky',
            message: 'L’Arlesiana. Итальянская лирика опять нашла календарь.',
            play: () => playNamedToneSequence(
                [
                    ['E4', 0.00, 0.32],
                    ['F#4', 0.34, 0.26],
                    ['G4', 0.62, 0.30],
                    ['A4', 0.94, 0.30],
                    ['B4', 1.26, 0.30],
                    ['A4', 1.58, 0.28],
                    ['G4', 1.88, 0.28],
                    ['F#4', 2.18, 0.28],
                    ['E4', 2.48, 0.30],
                    ['D4', 2.80, 0.40]
                ],
                'sine',
                0.062
            )
        },

        delibes: {
            aliases: [
                'DELIBES',
                'ДЕЛИБ'
            ],
            month: 1,
            day: 21,
            label: 'LD',
            title: '21 февраля — день рождения Лео Делиба',
            className: 'is-tchaikovsky',
            message: 'Flower Duet из Lakmé. Две партии, а календарь пока один.',
            play: () => playNamedToneSequence(
                [
                    ['E5', 0.00, 0.28],
                    ['D5', 0.30, 0.24],
                    ['E5', 0.56, 0.26],
                    ['F5', 0.84, 0.28],
                    ['E5', 1.14, 0.24],
                    ['D5', 1.40, 0.24],
                    ['E5', 1.66, 0.26],
                    ['F5', 1.94, 0.28],
                    ['E5', 2.24, 0.24],
                    ['F5', 2.50, 0.40]
                ],
                'sine',
                0.062
            )
        }

    };


    const EASTER_PROGRESS_KEY =
        'hse-orchestra-musical-easter-eggs-v1';


    function loadFoundMusicalEggs() {

        try {

            const raw =
                window.localStorage
                    .getItem(
                        EASTER_PROGRESS_KEY
                    );


            const values =
                raw
                    ? JSON.parse(
                        raw
                    )
                    : [];


            return new Set(
                Array.isArray(
                    values
                )

                    ? values.filter(
                        key =>
                            Boolean(
                                MUSICAL_EASTER_EGGS[
                                    key
                                ]
                            )
                    )

                    : []
            );

        }

        catch (
            error
        ) {

            return new Set();

        }

    }


    const foundMusicalEggs =
        loadFoundMusicalEggs();


    function saveFoundMusicalEggs() {

        try {

            window.localStorage
                .setItem(
                    EASTER_PROGRESS_KEY,
                    JSON.stringify(
                        [
                            ...foundMusicalEggs
                        ]
                    )
                );

        }

        catch (
            error
        ) {

            /*
             * Даже если localStorage недоступен,
             * текущая сессия продолжает считать находки.
             */

        }

    }


    function rememberMusicalEgg(
        key
    ) {

        if (
            !MUSICAL_EASTER_EGGS[
                key
            ]
            ||
            foundMusicalEggs.has(
                key
            )
        ) {

            return;

        }


        foundMusicalEggs.add(
            key
        );


        saveFoundMusicalEggs();

    }


    function showEasterProgress() {

        const total =
            Object.keys(
                MUSICAL_EASTER_EGGS
            )
            .length;


        const found =
            [
                ...foundMusicalEggs
            ]
            .filter(
                key =>
                    Boolean(
                        MUSICAL_EASTER_EGGS[
                            key
                        ]
                    )
            )
            .length;


        const left =
            Math.max(
                0,
                total - found
            );


        showToast(
            found === total

                ? 'Tutti! Найдено музыкальных пасхалок: ' +
                  found +
                  ' / ' +
                  total +
                  '.'

                : 'Найдено музыкальных пасхалок: ' +
                  found +
                  ' / ' +
                  total +
                  '. Осталось: ' +
                  left +
                  '.'
        );

    }


    function triggerMusicalEgg(
        key
    ) {

        const egg =
            MUSICAL_EASTER_EGGS[
                key
            ];


        if (
            !egg
        ) {

            return;

        }


        rememberMusicalEgg(
            key
        );


        activateMusicMode(
            egg.className,
            egg.message,
            egg.play
        );

    }


    function getCalendarSecretMarkers(
        month,
        day
    ) {

        return Object
            .entries(
                MUSICAL_EASTER_EGGS
            )
            .filter(
                ([, egg]) =>
                    Number.isInteger(
                        egg.month
                    )
                    &&
                    egg.month === month
                    &&
                    egg.day === day
            )
            .map(
                ([key, egg]) => ({
                    key,
                    label: egg.label,
                    title: egg.title
                })
            );

    }


    function findTypedMusicalEgg(
        value
    ) {

        /*
         * Ищем совпадение не по порядку композиторов,
         * а среди ВСЕХ псевдонимов сразу.
         *
         * Это важно для OFFENBACH / ОФФЕНБАХ:
         * обе строки заканчиваются на BACH / БАХ.
         * Поэтому сначала проверяем самые длинные
         * возможные команды.
         */

        const aliases =
            Object.entries(
                MUSICAL_EASTER_EGGS
            )
            .flatMap(
                ([key, egg]) =>
                    egg.aliases.map(
                        alias => ({
                            key,
                            alias
                        })
                    )
            )
            .sort(
                (a, b) =>
                    b.alias.length -
                    a.alias.length
            );


        const match =
            aliases.find(
                item =>
                    value.endsWith(
                        item.alias
                    )
            );


        return match
            ? match.key
            : null;

    }


    function ensureJeanModal() {

        let modal =
            document.getElementById(
                'orch-jean-modal'
            );


        if (
            modal
        ) {

            return modal;

        }


        modal =
            document.createElement(
                'div'
            );


        modal.id =
            'orch-jean-modal';


        modal.className =
            'orch-jean-modal';


        modal.hidden =
            true;


        modal.innerHTML =
            '<div class="orch-jean-modal__backdrop" data-jean-close></div>' +
            '<div class="orch-jean-modal__card" role="dialog" aria-modal="true" aria-label="Jean">' +
                '<button type="button" class="orch-jean-modal__close" data-jean-close aria-label="Закрыть">×</button>' +
                '<div class="orch-jean-modal__terminal">' +
                    '<span>jean_valjean@Jean-Valjean-Ubuntu:~$ whoami</span>' +
                    '<strong>Jean Valjean</strong>' +
                    '<small>HSE Orchestra · скрипка / код / оркестровый хаос</small>' +
                '</div>' +
                '<img class="orch-jean-modal__photo" ' +
                     'src="" ' +
                     'alt="Jean">' +
                '<div class="orch-jean-modal__quote" id="orch-jean-quote"></div>' +
            '</div>';


        const closeJeanModal =
            () => {

                modal.hidden =
                    true;


                document.body.style.overflow =
                    '';

            };


        modal
            .querySelectorAll(
                '[data-jean-close]'
            )
            .forEach(
                node => {

                    node.addEventListener(
                        'click',
                        closeJeanModal
                    );

                }
            );


        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape'
                    &&
                    !modal.hidden
                ) {

                    closeJeanModal();

                }

            }
        );


        document.body
            .appendChild(
                modal
            );


        return modal;

    }


    function showJeanEasterEgg() {

        const modal =
            ensureJeanModal();


        const quotes = [
            'Пюпитры сами себя не принесут.',
            'Создатель календаря обнаружен. Не пугайте его — он опять что-то автоматизирует.',
            'Jean был здесь. Потом ушёл разбираться, почему не пришли вторые скрипки.',
            'Сначала скрипка. Потом код. Потом почему-то снова код.',
            'Если всё работает — это пасхалка. Если нет — это репетиция.',
            '24601',
            'Сегодня без фортиссимо. Наверное.',
            'На репетицию пришёл. Уже достижение.',
            'Кто опять поставил пюпитр на проходе?',
            'Скрипка настроена. Жизнь — не обязательно.',
            'Дирижёрский жест был понятен. Просто не всем.',
            'Вторая скрипка вступила. Где-то.',
            'Первый пульт держится из последних сил.',
            'Да, это всё ещё календарь. Нет, объяснений не будет.',
            'Сначала четыре такта. Потом разберёмся.',
            'Тут могла быть серьёзная подпись.',
            'Темп хороший. Жаль, что у всех разный.',
            'Счёт до четырёх временно приостановлен.',
            'Программист найден. Музыкант тоже где-то рядом.',
            'Если видишь эту надпись — ты уже слишком глубоко в пасхалках.',
            'Ошибка ансамбля успешно воспроизведена.',
            'Репетиция закончилась. Обсуждение репетиции — нет.',
            'Аудитория найдена. Это уже половина успеха.',
            'Сегодня играем с листа. Как и вчера.',
            'Технически это было вступление.',
            'Дирижёр просил piano. Оркестр услышал другое.',
            'Смычок есть. Ноты есть. План сомнительный.',
            'Главное — уверенно показать вступление, даже если не туда.',
            'Календарь знает слишком много.',
            'Оркестр не опаздывает. Он появляется художественно.',
            'Если потерялся в форме — смотри на дирижёра. Он тоже ищет.',
            'Кто-то сейчас точно спросит: «А во сколько репетиция?»',
            'Пауза тоже музыка. Особенно если забыл ноты.',
            'Сегодня без divisi. Мы ещё не готовы морально.',
            'Три такта до катастрофы. Всё по плану.',
            'В этом окне уровень самоиронии выше уровня громкости.',
            'Не бойся сложных мест. Они боятся тебя меньше.',
            'Тут должен был быть умный музыкальный афоризм.',
            'Если все вступили вместе — сохрани этот момент.',
            'Ноты написаны композитором. Остальное — коллективное творчество.',
            'Очень важный человек. По крайней мере, так считает эта пасхалка.',
            'Jean mode: activated.',
            'Код работает. Оркестр — по расписанию.',
            'Вопрос «с какого места?» уже прозвучал мысленно.',
            'У каждого оркестра свой звук. У нас ещё и свой календарь.',
            'Сейчас бы ещё один дубль. И ещё один. И последний. Честно.',
            'Если ничего не понимаешь — сыграй тише.',
            'Контрабасы всё знают, но молчат.',
            'Солист готов. Оркестр почти.',
            'Кто поставил accelerando именно здесь?',
            'Эта фотография выбрана случайно. Как некоторые решения на репетиции.'
        ];


        const photos = [
            'jean-1.jpg',
            'jean-2.jpg',
            'jean-3.jpg',
            'jean-4.jpg',
            'jean-5.jpg',
            'jean-6.jpg',
            'jean-7.jpg',
            'jean-8.jpg'
        ];


        /*
         * Подписи выдаются как перетасованная колода.
         * Пока не закончатся все варианты, ни одна не повторится.
         */
        if (
            !jeanQuoteBag.length
        ) {

            jeanQuoteBag =
                quotes
                    .map(
                        (_, index) =>
                            index
                    );


            for (
                let index =
                    jeanQuoteBag.length - 1;
                index > 0;
                index--
            ) {

                const swapIndex =
                    Math.floor(
                        Math.random() *
                        (
                            index +
                            1
                        )
                    );


                [
                    jeanQuoteBag[
                        index
                    ],
                    jeanQuoteBag[
                        swapIndex
                    ]
                ] = [
                    jeanQuoteBag[
                        swapIndex
                    ],
                    jeanQuoteBag[
                        index
                    ]
                ];

            }


            if (
                jeanQuoteBag.length > 1
                &&
                jeanQuoteBag[
                    jeanQuoteBag.length - 1
                ] ===
                lastJeanQuoteIndex
            ) {

                [
                    jeanQuoteBag[
                        jeanQuoteBag.length - 1
                    ],
                    jeanQuoteBag[
                        jeanQuoteBag.length - 2
                    ]
                ] = [
                    jeanQuoteBag[
                        jeanQuoteBag.length - 2
                    ],
                    jeanQuoteBag[
                        jeanQuoteBag.length - 1
                    ]
                ];

            }

        }


        const quoteIndex =
            jeanQuoteBag.pop();


        lastJeanQuoteIndex =
            quoteIndex;


        const quote =
            quotes[
                quoteIndex
            ];


        let photoIndex =
            Math.floor(
                Math.random() *
                photos.length
            );


        if (
            photos.length > 1
            &&
            photoIndex ===
            lastJeanPhotoIndex
        ) {

            photoIndex =
                (
                    photoIndex +
                    1 +
                    Math.floor(
                        Math.random() *
                        (
                            photos.length -
                            1
                        )
                    )
                )
                %
                photos.length;

        }


        lastJeanPhotoIndex =
            photoIndex;


        const quoteNode =
            modal.querySelector(
                '#orch-jean-quote'
            );


        if (
            quoteNode
        ) {

            quoteNode.textContent =
                quote;

        }


        const photoNode =
            modal.querySelector(
                '.orch-jean-modal__photo'
            );


        if (
            photoNode
        ) {

            photoNode.src =
                CALENDAR_SYNC_BASE +
                'assets/jean/' +
                photos[
                    photoIndex
                ];

        }


        modal.hidden =
            false;


        document.body.style.overflow =
            'hidden';

    }

    function enableBeethovenMode() {
        triggerMusicalEgg('beethoven');
    }


    function enableBachMode() {
        triggerMusicalEgg('bach');
    }


    function enableTchaikovskyMode() {
        triggerMusicalEgg('tchaikovsky');
    }


    function enableMissionMode() {
        triggerMusicalEgg('mission');
    }


    function enableVivaldiMode() {
        triggerMusicalEgg('vivaldi');
    }


    function enableWagnerMode() {
        triggerMusicalEgg('wagner');
    }


    function enableBizetMode() {
        triggerMusicalEgg('bizet');
    }


    function bindEasterEggs() {

        $('#orch-month-label')
        ?.addEventListener(
            'click',
            () => {

                monthClicks++;


                if (
                    monthClicks === 5
                ) {

                    enableBeethovenMode();

                }

            }
        );


        $('[data-orch-action="today"]')
        ?.addEventListener(
            'click',
            () => {

                todayClicks++;


                if (
                    todayClicks === 7
                ) {

                    showToast(
                        'Да, сегодня всё ещё сегодня.'
                    );

                }

            }
        );


        $('#orch-secret-note')
        ?.addEventListener(
            'click',
            () => {

                noteClicks++;


                const messages = [
                    'Пюпитры сами себя не принесут.',
                    'Дирижёр видит даже пустые такты.',
                    'Сначала настройка. Потом настройка.',
                    'В календаре пауза — тоже музыка.',
                    'Тихо считается только до первого вступления.',
                    'Некоторые фамилии здесь лучше не произносить. Их лучше набрать.',
                    'У этого инструмента больше клавиш, чем кажется.',
                    'Фамилии композиторов здесь иногда звучат громче нот.'
                ];


                if (
                    noteClicks === 5
                ) {

                    enableBachMode();

                    return;

                }


                if (
                    noteClicks === 6
                ) {

                    enableTchaikovskyMode();

                    return;

                }


                if (
                    noteClicks === 7
                ) {

                    enableMissionMode();

                    return;

                }


                if (
                    noteClicks === 9
                ) {

                    enableBeethovenMode();

                    return;

                }


                showToast(
                    messages[
                        (noteClicks - 1) %
                        messages.length
                    ]
                );

            }
        );


        $$('[data-orch-action="prev"], [data-orch-action="next"]')
        .forEach(
            button => {

                button.addEventListener(
                    'click',
                    () => {

                        /*
                         * Пасхалка Вивальди — «Весна».
                         * Срабатывает только после перехода стрелкой
                         * именно на март, а не после N нажатий подряд.
                         */
                        if (
                            state.month === 2
                        ) {

                            enableVivaldiMode();

                        }

                    }
                );

            }
        );


        $('#orch-download-all')
        ?.addEventListener(
            'click',
            () => {

                window.setTimeout(
                    () => showToast(
                        'Партитура расписания сохранена.'
                    ),
                    120
                );

            }
        );


        document.addEventListener(
            'keydown',
            event => {

                const target =
                    event.target;


                if (
                    target instanceof HTMLInputElement
                    ||
                    target instanceof HTMLTextAreaElement
                    ||
                    target?.isContentEditable
                ) {

                    return;

                }


                if (
                    event.key.length !== 1
                ) {

                    return;

                }


                if (
                    !keyboardHintShown
                    &&
                    /[A-Za-zА-Яа-яЁё]/u.test(
                        event.key
                    )
                ) {

                    keyboardHintShown =
                        true;


                    showToast(
                        'Календарь слушает.'
                    );

                }


                typedSecret =
                    (
                        typedSecret +
                        event.key.toUpperCase()
                    )
                    .slice(-32);


                if (
                    typedSecret.endsWith(
                        'JEAN'
                    )
                    ||
                    typedSecret.endsWith(
                        'ЖАН'
                    )
                ) {

                    event.stopImmediatePropagation();


                    showJeanEasterEgg();


                    typedSecret =
                        '';


                    return;

                }


                if (
                    typedSecret.endsWith(
                        'EASTER'
                    )
                    ||
                    typedSecret.endsWith(
                        'ПАСХАЛКИ'
                    )
                ) {

                    event.stopImmediatePropagation();


                    showEasterProgress();


                    typedSecret =
                        '';


                    return;

                }


                const typedEgg =
                    findTypedMusicalEgg(
                        typedSecret
                    );


                if (
                    typedEgg
                ) {

                    /*
                     * Перехватываем уже распознанную длинную команду
                     * на capture-фазе. Это не даёт старому inline-коду
                     * (если он всё ещё закэширован Tilda/браузером)
                     * отдельно увидеть хвост BACH / БАХ внутри
                     * OFFENBACH / ОФФЕНБАХ.
                     */
                    event.stopImmediatePropagation();


                    triggerMusicalEgg(
                        typedEgg
                    );


                    typedSecret =
                        '';

                }

            },
            true
        );

    }


    /* ==========================================
       МОСКОВСКАЯ ДАТА
       ========================================== */

    function moscowParts(
        date = new Date()
    ) {

        const parts =
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: TZ,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }
            )
            .formatToParts(
                date
            );


        const obj = {};


        parts.forEach(
            part => {

                if (
                    part.type !==
                    'literal'
                ) {

                    obj[
                        part.type
                    ] =
                        part.value;

                }

            }
        );


        return {

            year:
                +obj.year,

            month:
                +obj.month - 1,

            day:
                +obj.day

        };

    }


    function dateKey(
        year,
        month,
        day
    ) {

        return (
            year +
            '-' +
            String(
                month + 1
            )
            .padStart(
                2,
                '0'
            ) +
            '-' +
            String(
                day
            )
            .padStart(
                2,
                '0'
            )
        );

    }


    /* ==========================================
       ПАРСИНГ ДАТЫ TILDA
       ========================================== */

    function parseDateText(
        text
    ) {

        const value =
            clean(
                text
            );


        let match =
            value.match(
                /\b(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})\b/
            );


        if (
            match
        ) {

            return (
                match[3] +
                '-' +
                match[2]
                    .padStart(
                        2,
                        '0'
                    ) +
                '-' +
                match[1]
                    .padStart(
                        2,
                        '0'
                    )
            );

        }


        match =
            value.match(
                /\b(\d{4})-(\d{1,2})-(\d{1,2})(?=$|[T\s])/
            );


        if (
            match
        ) {

            return (
                match[1] +
                '-' +
                match[2]
                    .padStart(
                        2,
                        '0'
                    ) +
                '-' +
                match[3]
                    .padStart(
                        2,
                        '0'
                    )
            );

        }


        return null;

    }


    function addDays(
        key,
        amount
    ) {

        const date =
            new Date(
                key +
                'T12:00:00Z'
            );


        date.setUTCDate(
            date.getUTCDate() +
            amount
        );


        return date
            .toISOString()
            .slice(
                0,
                10
            );

    }


    function daysBetween(
        first,
        second
    ) {

        const a =
            Date.parse(
                first +
                'T12:00:00Z'
            );


        const b =
            Date.parse(
                second +
                'T12:00:00Z'
            );


        return Math.round(
            (
                b - a
            ) /
            86400000
        );

    }


    function mondayIndex(
        key
    ) {

        return (
            new Date(
                key +
                'T12:00:00Z'
            )
            .getUTCDay() +
            6
        ) % 7;

    }


    function normalized(
        value
    ) {

        return clean(
            value
        )
        .toLowerCase()
        .replace(
            /ё/g,
            'е'
        );

    }


    function fieldUrl(
        value
    ) {

        if (
            value &&
            typeof value ===
            'object'
        ) {

            return clean(
                value.url
            );

        }


        return clean(
            value
        );

    }


    /* ==========================================
       ВРЕМЯ + МЕСТО
       ========================================== */

    function parseMeta(
        text
    ) {

        const value =
            clean(
                text
            );


        const match =
            value.match(
                /(\d{1,2}:\d{2})(?:\s*[–—-]\s*(\d{1,2}:\d{2}))?/
            );


        const start =
            match
                ? match[1]
                : '00:00';


        const end =
            match &&
            match[2]

                ? match[2]
                : start;


        let location =
            value;


        if (
            match
        ) {

            location =
                value
                .replace(
                    match[0],
                    ''
                )
                .replace(
                    /^[\s·•|,;—–-]+/,
                    ''
                )
                .trim();

        }


        return {

            start,
            end,
            location

        };

    }


    function toTimestamp(
        key,
        time
    ) {

        return new Date(
            key +
            'T' +
            time +
            ':00' +
            TZ_OFFSET
        )
        .getTime();

    }


    /* ==========================================
       ФОРМАТИРОВАНИЕ
       ========================================== */

    function formatDateRu(
        key
    ) {

        const date =
            new Date(
                key +
                'T12:00:00' +
                TZ_OFFSET
            );


        const formatted =
            new Intl
                .DateTimeFormat(
                    'ru-RU',
                    {
                        timeZone: TZ,
                        weekday:
                            'long',
                        day:
                            'numeric',
                        month:
                            'long'
                    }
                )
                .format(
                    date
                );


        return formatted
            .replace(
                /^./u,
                char =>
                    char.toUpperCase()
            )
            .replace(
                /(,\s*\d{1,2}\s+)([а-яё])/u,
                (
                    _,
                    prefix,
                    monthFirst
                ) =>
                    prefix +
                    monthFirst.toUpperCase()
            );

    }


    function formatMonthRu(
        year,
        month
    ) {

        const date =
            new Date(
                Date.UTC(
                    year,
                    month,
                    1,
                    12
                )
            );


        const formatted =
            new Intl
                .DateTimeFormat(
                    'ru-RU',
                    {
                        timeZone:
                            'UTC',
                        month:
                            'long',
                        year:
                            'numeric'
                    }
                )
                .format(
                    date
                );


        return formatted
            .replace(
                /^./u,
                char =>
                    char.toUpperCase()
            );

    }


    /* ==========================================
       ЧИТАЕМ CUSTOM FEED TILDA
       ========================================== */

    function feedUid() {

        return $(
            FEED_SELECTOR +
            ' .js-cms-data-holder[data-feedpart]'
        )
        ?.dataset
        ?.feedpart
        ||
        '';

    }


    async function loadFeedRecords() {

        const uid =
            feedUid();


        if (
            !uid
        ) {

            throw new Error(
                'Не найден Custom Feed с классом ' +
                FEED_SELECTOR
            );

        }


        const records = [];

        let slice = 1;
        let total = Infinity;


        while (
            records.length <
            total
        ) {

            const url =
                new URL(
                    FEED_API
                );


            url.searchParams.set(
                'feeduid',
                uid
            );


            url.searchParams.set(
                'size',
                String(
                    FEED_PAGE_SIZE
                )
            );


            url.searchParams.set(
                'slice',
                String(
                    slice
                )
            );


            const response =
                await fetch(
                    url.toString(),
                    {
                        method:
                            'GET',

                        mode:
                            'cors',

                        credentials:
                            'omit'
                    }
                );


            if (
                !response.ok
            ) {

                throw new Error(
                    'Tilda Feed HTTP ' +
                    response.status
                );

            }


            const payload =
                await response.json();


            if (
                !payload.success ||
                !payload.result
            ) {

                throw new Error(
                    'Tilda Feed вернул ошибку'
                );

            }


            const posts =
                payload.result.posts
                ||
                [];


            total =
                Number(
                    payload.result.total
                )
                ||
                0;


            records.push(
                ...posts
            );


            if (
                !posts.length ||
                posts.length <
                FEED_PAGE_SIZE
            ) {

                break;

            }


            slice++;


            if (
                slice > 50
            ) {

                break;

            }

        }


        return records;

    }


    function makeEvent(
        data
    ) {

        const key =
            parseDateText(
                data.dateKey
            );


        if (
            !key
        ) {

            return null;

        }


        const startTime =
            clean(
                data.startTime
            )
            ||
            '00:00';


        const endTime =
            clean(
                data.endTime
            )
            ||
            startTime;


        const startTs =
            toTimestamp(
                key,
                startTime
            );


        let endTs =
            toTimestamp(
                key,
                endTime
            );


        if (
            endTs <
            startTs
        ) {

            endTs +=
                86400000;

        }


        return {

            id:
                data.id,

            title:
                clean(
                    data.title
                )
                ||
                'Событие',

            type:
                clean(
                    data.type
                )
                ||
                'Другое',

            dateKey:
                key,

            sourceDate:
                data.sourceDate
                ||
                key,

            seriesId:
                clean(
                    data.seriesId
                ),

            startTime,

            endTime,

            location:
                clean(
                    data.location
                ),

            program:
                clean(
                    data.program
                ),

            note:
                clean(
                    data.note
                ),

            url:
                clean(
                    data.url
                ),

            startTs,

            endTs

        };

    }


    function singleEvent(
        post
    ) {

        const fields =
            post.fields
            ||
            {};


        return makeEvent(
            {
                id:
                    'orch-single-' +
                    post.uid,

                title:
                    fields.title,

                type:
                    fields.select,

                dateKey:
                    fields['custom-date'],

                startTime:
                    fields.input2,

                endTime:
                    fields.input3,

                location:
                    fields.input4,

                program:
                    fields.textarea,

                url:
                    fieldUrl(
                        fields.url
                    )
            }
        );

    }


    function seriesEvents(
        post
    ) {

        const fields =
            post.fields
            ||
            {};


        const first =
            parseDateText(
                fields['custom-date2']
            );


        const last =
            parseDateText(
                fields['custom-date3']
            );


        const seriesId =
            clean(
                fields.input5
            );


        if (
            !first ||
            !last ||
            !seriesId ||
            first > last
        ) {

            return [];

        }


        const weekdays = [
            fields.number,
            fields.number2,
            fields.number3,
            fields.number4,
            fields.number5,
            fields.number6,
            fields.number7
        ]
        .map(
            Boolean
        );


        const everyTwoWeeks =
            normalized(
                fields.select3
            )
            .includes(
                '2'
            );


        const result = [];


        for (
            let key = first;
            key <= last;
            key = addDays(
                key,
                1
            )
        ) {

            const weekday =
                mondayIndex(
                    key
                );


            if (
                !weekdays[
                    weekday
                ]
            ) {

                continue;

            }


            if (
                everyTwoWeeks
            ) {

                const week =
                    Math.floor(
                        daysBetween(
                            first,
                            key
                        ) /
                        7
                    );


                if (
                    week % 2 !== 0
                ) {

                    continue;

                }

            }


            const event =
                makeEvent(
                    {
                        id:
                            'orch-series-' +
                            post.uid +
                            '-' +
                            key,

                        title:
                            fields.title,

                        type:
                            fields.select,

                        dateKey:
                            key,

                        sourceDate:
                            key,

                        seriesId,

                        startTime:
                            fields.input2,

                        endTime:
                            fields.input3,

                        location:
                            fields.input4,

                        program:
                            fields.textarea,

                        url:
                            fieldUrl(
                                fields.url
                            )
                    }
                );


            if (
                event
            ) {

                result.push(
                    event
                );

            }

        }


        return result;

    }


    function applyChanges(
        events,
        changes
    ) {

        const byOccurrence =
            new Map();


        changes.forEach(
            post => {

                const fields =
                    post.fields
                    ||
                    {};


                const seriesId =
                    clean(
                        fields.input6
                    );


                const sourceDate =
                    parseDateText(
                        fields['custom-date4']
                    );


                if (
                    seriesId &&
                    sourceDate
                ) {

                    byOccurrence.set(
                        seriesId +
                        '|' +
                        sourceDate,
                        post
                    );

                }

            }
        );


        return events
            .map(
                event => {

                    if (
                        !event.seriesId
                    ) {

                        return event;

                    }


                    const post =
                        byOccurrence.get(
                            event.seriesId +
                            '|' +
                            event.sourceDate
                        );


                    if (
                        !post
                    ) {

                        return event;

                    }


                    const fields =
                        post.fields
                        ||
                        {};


                    const action =
                        normalized(
                            fields.select4
                        );


                    if (
                        action.includes(
                            'отмен'
                        )
                    ) {

                        return null;

                    }


                    const changed =
                        makeEvent(
                            {
                                id:
                                    event.id +
                                    '-changed-' +
                                    post.uid,

                                title:
                                    event.title,

                                type:
                                    event.type,

                                dateKey:
                                    parseDateText(
                                        fields['custom-date5']
                                    )
                                    ||
                                    event.dateKey,

                                sourceDate:
                                    event.sourceDate,

                                seriesId:
                                    event.seriesId,

                                startTime:
                                    clean(
                                        fields.input7
                                    )
                                    ||
                                    event.startTime,

                                endTime:
                                    clean(
                                        fields.input8
                                    )
                                    ||
                                    event.endTime,

                                location:
                                    clean(
                                        fields.input9
                                    )
                                    ||
                                    event.location,

                                program:
                                    clean(
                                        fields.textarea3
                                    )
                                    ||
                                    event.program,

                                note:
                                    event.note,

                                url:
                                    event.url
                            }
                        );


                    return changed;

                }
            )
            .filter(
                Boolean
            );

    }


    function extractEvents(
        posts
    ) {

        const singles = [];
        const series = [];
        const changes = [];


        posts.forEach(
            post => {

                const fields =
                    post.fields
                    ||
                    {};


                const kind =
                    normalized(
                        fields.select2
                    );


                if (
                    kind.includes(
                        'измен'
                    )
                ) {

                    changes.push(
                        post
                    );

                }

                else if (
                    kind.includes(
                        'сери'
                    )
                ) {

                    series.push(
                        ...seriesEvents(
                            post
                        )
                    );

                }

                else if (
                    kind.includes(
                        'одиноч'
                    )
                ) {

                    const event =
                        singleEvent(
                            post
                        );


                    if (
                        event
                    ) {

                        singles.push(
                            event
                        );

                    }

                }

            }
        );


        return applyChanges(
            [
                ...singles,
                ...series
            ],
            changes
        )
        .sort(
            (
                a,
                b
            ) =>
                a.startTs -
                b.startTs
        );

    }


    /* ==========================================
       ФИЛЬТРЫ
       ========================================== */

    function renderFilters() {

        const root =
            $(
                '#orch-filters'
            );


        if (
            !root
        ) {

            return;

        }


        const types = [

            ...new Set(

                state.events

                .map(
                    event =>
                        event.type
                )

                .filter(
                    Boolean
                )

            )

        ];


        const labels = [

            'Все',

            ...types

        ];


        root.innerHTML =
            labels

            .map(
                label =>

                    '<button ' +
                    'type="button" ' +
                    'class="orch-filter' +
                    (
                        state.filter ===
                        label

                            ? ' is-active'
                            : ''
                    ) +
                    '" ' +
                    'data-orch-filter="' +
                    escapeHtml(
                        label
                    ) +
                    '">' +

                    escapeHtml(
                        label
                    ) +

                    '</button>'

            )

            .join(
                ''
            );


        $$(
            '.orch-filter',
            root
        )

        .forEach(
            button => {

                button
                    .addEventListener(
                        'click',
                        () => {

                            state.filter =
                                button
                                    .dataset
                                    .orchFilter;


                            renderFilters();

                            renderCalendar();

                        }
                    );

            }
        );

    }


    /* ==========================================
       КАЛЕНДАРЬ
       ========================================== */

    function renderMobileAgenda(
        events
    ) {

        const root =
            $(
                '#orch-mobile-agenda'
            );


        if (
            !root
        ) {

            return;

        }


        root.innerHTML =
            '';


        const monthPrefix =
            state.year +
            '-' +
            String(
                state.month + 1
            )
            .padStart(
                2,
                '0'
            ) +
            '-';


        const grouped =
            new Map();


        events
            .filter(
                event =>
                    event.dateKey
                        .startsWith(
                            monthPrefix
                        )
            )
            .forEach(
                event => {

                    if (
                        !grouped.has(
                            event.dateKey
                        )
                    ) {

                        grouped.set(
                            event.dateKey,
                            []
                        );

                    }


                    grouped
                        .get(
                            event.dateKey
                        )
                        .push(
                            event
                        );

                }
            );


        Array.from(
            grouped.entries()
        )
        .sort(
            (
                a,
                b
            ) =>
                a[0]
                    .localeCompare(
                        b[0]
                    )
        )
        .forEach(
            (
                [
                    key,
                    dayEvents
                ]
            ) => {

                const section =
                    document
                        .createElement(
                            'section'
                        );


                section.className =
                    'orch-mobile-day';


                section.innerHTML =
                    '<div class="orch-mobile-day__date">' +
                    escapeHtml(
                        formatDateRu(
                            key
                        )
                    ) +
                    '</div>' +
                    '<div class="orch-mobile-day__events"></div>';


                const list =
                    $(
                        '.orch-mobile-day__events',
                        section
                    );


                dayEvents
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.startTs -
                            b.startTs
                    )
                    .forEach(
                        event => {

                            const button =
                                document
                                    .createElement(
                                        'button'
                                    );


                            button.type =
                                'button';


                            button.className =
                                'orch-mobile-event';


                            button.dataset.type =
                                String(
                                    event.type || ''
                                )
                                .toLowerCase();


                            const meta = [

                                event.type,

                                event.location

                            ]
                            .filter(
                                Boolean
                            )
                            .join(
                                ' · '
                            );


                            button.innerHTML =
                                '<span class="orch-mobile-event__time">' +
                                escapeHtml(
                                    event.startTime +
                                    '–' +
                                    event.endTime
                                ) +
                                '</span>' +
                                '<span class="orch-mobile-event__title">' +
                                escapeHtml(
                                    event.title
                                ) +
                                '</span>' +
                                (
                                    meta

                                        ? '<span class="orch-mobile-event__meta">' +
                                          escapeHtml(
                                              meta
                                          ) +
                                          '</span>'

                                        : ''
                                );


                            button
                                .addEventListener(
                                    'click',
                                    () => {

                                        showDetails(
                                            event
                                        );

                                    }
                                );


                            list
                                .appendChild(
                                    button
                                );

                        }
                    );


                root
                    .appendChild(
                        section
                    );

            }
        );

    }

    function renderCalendar() {

        const grid =
            $(
                '#orch-grid'
            );


        const label =
            $(
                '#orch-month-label'
            );


        const empty =
            $(
                '#orch-calendar-empty'
            );


        if (
            !grid ||
            !label
        ) {

            return;

        }


        label.textContent =
            formatMonthRu(
                state.year,
                state.month
            );


        grid.innerHTML =
            '';


        /*
         * День недели первого числа.
         *
         * Понедельник = 0.
         */

        const firstWeekday =

            (
                new Date(
                    Date.UTC(
                        state.year,
                        state.month,
                        1
                    )
                )
                .getUTCDay()
                +
                6
            )
            %
            7;


        const daysCurrent =

            new Date(
                Date.UTC(
                    state.year,
                    state.month + 1,
                    0
                )
            )
            .getUTCDate();


        const prevMonth =

            state.month === 0

                ? 11
                : state.month - 1;


        const prevYear =

            state.month === 0

                ? state.year - 1
                : state.year;


        const daysPrev =

            new Date(
                Date.UTC(
                    prevYear,
                    prevMonth + 1,
                    0
                )
            )
            .getUTCDate();


        const today =
            moscowParts();


        const todayKey =
            dateKey(
                today.year,
                today.month,
                today.day
            );


        const visibleEvents =

            state.events

            .filter(
                event =>

                    state.filter ===
                    'Все'

                    ||

                    event.type ===
                    state.filter
            );


        renderMobileAgenda(
            visibleEvents
        );


        let currentMonthCount =
            0;


        /*
         * Всегда 6 строк календаря.
         */

        for (
            let cell = 0;
            cell < 42;
            cell++
        ) {

            let year =
                state.year;

            let month =
                state.month;

            let day;

            let outside =
                false;


            /*
             * Предыдущий месяц.
             */

            if (
                cell <
                firstWeekday
            ) {

                day =
                    daysPrev -
                    firstWeekday +
                    cell +
                    1;


                year =
                    prevYear;


                month =
                    prevMonth;


                outside =
                    true;

            }


            /*
             * Следующий месяц.
             */

            else if (

                cell >=

                firstWeekday +
                daysCurrent

            ) {

                day =
                    cell -
                    (
                        firstWeekday +
                        daysCurrent
                    )
                    +
                    1;


                month =

                    state.month === 11

                        ? 0
                        : state.month + 1;


                year =

                    state.month === 11

                        ? state.year + 1
                        : state.year;


                outside =
                    true;

            }


            /*
             * Текущий месяц.
             */

            else {

                day =
                    cell -
                    firstWeekday +
                    1;

            }


            const key =
                dateKey(
                    year,
                    month,
                    day
                );


            const dayEvents =

                visibleEvents

                .filter(
                    event =>
                        event.dateKey ===
                        key
                );


            if (
                !outside
            ) {

                currentMonthCount +=
                    dayEvents.length;

            }


            const cellElement =
                document
                    .createElement(
                        'div'
                    );


            const secretMarkers =
                getCalendarSecretMarkers(
                    month,
                    day
                );


            cellElement.className =

                'orch-day' +

                (
                    outside
                        ? ' is-outside'
                        : ''
                )

                +

                (
                    key ===
                    todayKey

                        ? ' is-today'
                        : ''
                );


            cellElement.innerHTML =

                '<div class="orch-day__num">' +
                day +
                '</div>' +

                (
                    secretMarkers.length

                        ? '<div class="orch-day__secrets">' +
                            secretMarkers
                                .map(
                                    marker =>
                                        '<button type="button" class="orch-day__secret" ' +
                                        'data-secret-key="' +
                                        escapeHtml(
                                            marker.key
                                        ) +
                                        '" title="' +
                                        escapeHtml(
                                            marker.title
                                        ) +
                                        '">' +
                                        escapeHtml(
                                            marker.label
                                        ) +
                                        '</button>'
                                )
                                .join('') +
                            '</div>'

                        : ''
                ) +

                '<div class="orch-day__events"></div>';


            const dayNumberElement =
                $(
                    '.orch-day__num',
                    cellElement
                );


            if (
                !outside
                &&
                dayNumberElement
            ) {

                const specialMessage =
                    specialDateEasterEggMessage(
                        month,
                        day
                    );


                if (
                    specialMessage
                ) {

                    dayNumberElement
                        .addEventListener(
                            'click',
                            event => {

                                event.stopPropagation();


                                showToast(
                                    specialMessage
                                );

                            }
                        );

                }

            }


            $$(
                '.orch-day__secret',
                cellElement
            )
            .forEach(
                markerElement => {

                    markerElement.addEventListener(
                        'click',
                        event => {

                            event.stopPropagation();


                            triggerMusicalEgg(
                                markerElement.dataset.secretKey
                            );

                        }
                    );

                }
            );


            if (
                !outside
                &&
                dayEvents.length === 0
            ) {

                cellElement.addEventListener(
                    'click',
                    event => {

                        if (
                            event.detail === 3
                        ) {

                            const messages = [
                                'Здесь могла быть репетиция, но аудиторию уже заняли.',
                                'Пустой такт. Не вступаем.',
                                'Редкий день, когда никто не написал: «а сегодня репетиция?»'
                            ];


                            showToast(
                                messages[
                                    day %
                                    messages.length
                                ]
                            );

                        }

                    }
                );

            }


            const list =
                $(
                    '.orch-day__events',
                    cellElement
                );


            dayEvents
                .forEach(
                    event => {

                        const button =
                            document
                                .createElement(
                                    'button'
                                );


                        button.type =
                            'button';


                        button.className =
                            'orch-event-pill';


                        button.dataset.type =
                            event.type
                                .toLowerCase();


                        button.innerHTML =

                            '<strong>' +

                            escapeHtml(
                                event.startTime
                            ) +

                            '</strong> ' +

                            escapeHtml(
                                event.title
                            );


                        button
                            .addEventListener(
                                'click',
                                () => {

                                    showDetails(
                                        event
                                    );

                                }
                            );


                        list
                            .appendChild(
                                button
                            );

                    }
                );


            grid
                .appendChild(
                    cellElement
                );

        }


        if (
            empty
        ) {

            empty.hidden =
                currentMonthCount >
                0;


            empty.textContent =
                'В этом месяце пауза. Считаем её генеральной.';

        }

    }


    /* ==========================================
       ПОДРОБНОСТИ СОБЫТИЯ
       ========================================== */

    function showDetails(
        event
    ) {

        state.selected =
            event;


        const eventText =
            clean(
                [
                    event.title,
                    event.program,
                    event.note
                ]
                .filter(Boolean)
                .join(' ')
            )
            .toLowerCase();


        const box =
            $(
                '#orch-event-details'
            );


        if (
            !box
        ) {

            return;

        }


        $(
            '#orch-details-type'
        )
        .textContent =
            event.type;


        $(
            '#orch-details-title'
        )
        .textContent =
            event.title;


        const detailsMeta =
            $(
                '#orch-details-meta'
            );


        const detailsTime =
            event.startTime ===
            event.endTime

                ? event.startTime

                : event.startTime +
                  '–' +
                  event.endTime;


        detailsMeta.innerHTML =

            '<div class="orch-details__meta-main">' +

                '<span class="orch-details__meta-date">' +
                escapeHtml(
                    formatDateRu(
                        event.dateKey
                    )
                ) +
                '</span>' +

                '<span class="orch-details__meta-time">' +
                escapeHtml(
                    detailsTime
                ) +
                '</span>' +

            '</div>' +

            (
                event.location

                    ? '<div class="orch-details__meta-location">' +
                      escapeHtml(
                          event.location
                      ) +
                      '</div>'

                    : ''
            );


        const cleanProgram =
            String(
                event.program || ''
            )
            .replace(
                /^\s*программа\s*:\s*/iu,
                ''
            )
            .replace(
                /\s+(?=\d+\.\s)/g,
                '\n'
            )
            .trim();


        const extra = [

            cleanProgram,

            event.note

        ]

        .filter(
            Boolean
        )

        .join(
            '\n\n'
        );


        const program =
            $(
                '#orch-details-program'
            );


        program.textContent =
            extra;


        program.hidden =
            !extra;


        box.hidden =
            false;


        $(
            '#orch-details-ics'
        )
        .onclick =
            () => {

                downloadIcs(

                    [
                        event
                    ],

                    event.dateKey +
                    '-' +
                    safeFile(
                        event.title
                    ) +
                    '.ics'

                );


                showToast(
                    'Событие добавлено. Теперь забыть сложнее.'
                );

            };


        const detailsLink =
            $(
                '#orch-details-link'
            );


        if (
            detailsLink
        ) {

            detailsLink.hidden =
                !event.url;


            if (
                event.url
            ) {

                detailsLink.href =
                    event.url;

            }

        }


        box.scrollIntoView(
            {
                behavior:
                    'smooth',

                block:
                    'nearest'
            }
        );


        if (
            eventText.includes(
                'миссия невыполнима'
            )
            ||
            eventText.includes(
                'mission impossible'
            )
        ) {

            enableMissionMode();

        }

    }


    /* ==========================================
       CR38 — БЛИЖАЙШЕЕ СОБЫТИЕ
       ========================================== */



    /* ==========================================
       ICS
       ========================================== */

    function escapeIcs(
        value
    ) {

        return String(
            value || ''
        )

        .replace(
            /\\/g,
            '\\\\'
        )

        .replace(
            /\n/g,
            '\\n'
        )

        .replace(
            /,/g,
            '\\,'
        )

        .replace(
            /;/g,
            '\\;'
        );

    }


    function icsDateTime(
        key,
        time
    ) {

        return (

            key.replace(
                /-/g,
                ''
            )

            +

            'T'

            +

            time.replace(
                ':',
                ''
            )

            +

            '00'

        );

    }


    function icsEvent(
        event
    ) {

        const description = [

            event.type,

            event.program,

            event.note

        ]

        .filter(
            Boolean
        )

        .join(
            '\n\n'
        );


        return [

            'BEGIN:VEVENT',

            'UID:' +
            escapeIcs(
                event.id
            ) +
            '@orchestra.hse.ru',

            'DTSTAMP:' +
            new Date()
                .toISOString()
                .replace(
                    /[-:]/g,
                    ''
                )
                .replace(
                    /\.\d{3}Z$/,
                    'Z'
                ),

            'DTSTART;TZID=' +
            TZ +
            ':' +
            icsDateTime(
                event.dateKey,
                event.startTime
            ),

            'DTEND;TZID=' +
            TZ +
            ':' +
            icsDateTime(
                event.dateKey,
                event.endTime
            ),

            'SUMMARY:' +
            escapeIcs(
                event.title
            ),

            'LOCATION:' +
            escapeIcs(
                event.location
            ),

            'DESCRIPTION:' +
            escapeIcs(
                description
            ),

            'END:VEVENT'

        ]

        .join(
            '\r\n'
        );

    }


    function downloadIcs(
        events,
        filename =
            'HSE-Orchestra.ics'
    ) {

        const selected =
            events.filter(
                Boolean
            );


        if (
            !selected.length
        ) {

            return;

        }


        const content = [

            'BEGIN:VCALENDAR',

            'VERSION:2.0',

            'PRODID:-//HSE Orchestra//Schedule//RU',

            'CALSCALE:GREGORIAN',

            'METHOD:PUBLISH',

            'X-WR-CALNAME:HSE Orchestra',

            'X-WR-TIMEZONE:' +
            TZ,

            ...selected.map(
                icsEvent
            ),

            'END:VCALENDAR'

        ]

        .join(
            '\r\n'
        );


        const blob =
            new Blob(

                [
                    content
                ],

                {
                    type:
                        'text/calendar;charset=utf-8'
                }

            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document
                .createElement(
                    'a'
                );


        link.href =
            url;


        link.download =
            filename;


        document.body
            .appendChild(
                link
            );


        link.click();


        link.remove();


        setTimeout(
            () =>
                URL.revokeObjectURL(
                    url
                ),
            1000
        );

    }


    /* ==========================================
       SAFE FILE NAME
       ========================================== */

    function safeFile(
        value
    ) {

        return String(
            value ||
            'event'
        )

        .replace(
            /[^a-zA-Zа-яА-ЯёЁ0-9_-]+/g,
            '-'
        )

        .replace(
            /^-+|-+$/g,
            ''
        );

    }


    /* ==========================================
       HTML ESCAPE
       ========================================== */

    function escapeHtml(
        value
    ) {

        return String(
            value || ''
        )

        .replace(
            /[&<>'"]/g,
            character => (

                {

                    '&':
                        '&amp;',

                    '<':
                        '&lt;',

                    '>':
                        '&gt;',

                    "'":
                        '&#39;',

                    '"':
                        '&quot;'

                }

                [
                    character
                ]

            )
        );

    }


    /* ==========================================
       STATE
       ========================================== */

    function initCalendarState() {

        const now =
            moscowParts();


        if (
            state.year ===
            null
        ) {

            state.year =
                now.year;

        }


        if (
            state.month ===
            null
        ) {

            state.month =
                now.month;

        }

    }


    /* ==========================================
       ОБНОВЛЕНИЕ
       ========================================== */

    async function refresh() {

        try {

            const posts =
                await loadFeedRecords();


            state.events =
                extractEvents(
                    posts
                );


            initCalendarState();


            renderFilters();


            renderCalendar();


            return true;

        }

        catch (
            error
        ) {

            console.error(
                '[HSE Orchestra Calendar]',
                error
            );


            initCalendarState();


            renderFilters();


            renderCalendar();


            const empty =
                $(
                    '#orch-calendar-empty'
                );


            if (
                empty
            ) {

                empty.hidden =
                    false;


                empty.textContent =
                    'Не удалось загрузить расписание. Обновите страницу.';

            }


            return false;

        }

    }


    /* ==========================================
       ПОДПИСКА НА КАЛЕНДАРЬ
       ========================================== */

    function calendarSubscriptionUrl(
        key = selectedCalendarKey
    ) {

        return (
            CALENDAR_SYNC_BASE +
            (
                CALENDAR_SYNC_FILES[key]
                ||
                CALENDAR_SYNC_FILES.all
            )
        );

    }


    function openSubscribeModal() {

        const modal =
            $('#orch-subscribe-modal');


        if (
            !modal
        ) {

            return;

        }


        modal.hidden =
            false;


        document.body.style.overflow =
            'hidden';

    }


    function closeSubscribeModal() {

        const modal =
            $('#orch-subscribe-modal');


        if (
            !modal
        ) {

            return;

        }


        modal.hidden =
            true;


        document.body.style.overflow =
            '';

    }


    function selectCalendar(
        key
    ) {

        if (
            !CALENDAR_SYNC_FILES[key]
        ) {

            return;

        }


        selectedCalendarKey =
            key;


        $$(
            '[data-calendar-key]'
        )
        .forEach(
            button => {

                button.classList.toggle(
                    'is-active',
                    button.dataset.calendarKey ===
                    key
                );

            }
        );

    }


    async function copySubscriptionUrl() {

        const url =
            calendarSubscriptionUrl();


        try {

            await navigator.clipboard
                .writeText(
                    url
                );


            showToast(
                'Ссылка на подписку скопирована.'
            );

        }

        catch (
            error
        ) {

            window.prompt(
                'Скопируйте ссылку на календарь:',
                url
            );

        }

    }


    function calendarDownloadEvents(
        key = selectedCalendarKey
    ) {

        const matches =
            event => {

                const type =
                    normalized(
                        event.type
                    );


                if (
                    key === 'rehearsals'
                ) {

                    return type.includes(
                        'репет'
                    );

                }


                if (
                    key === 'concerts'
                ) {

                    return type.includes(
                        'конц'
                    );

                }


                if (
                    key === 'meetings'
                ) {

                    return type.includes(
                        'собран'
                    );

                }


                if (
                    key === 'other'
                ) {

                    return (
                        !type.includes('репет')
                        &&
                        !type.includes('конц')
                        &&
                        !type.includes('собран')
                    );

                }


                return true;

            };


        return state.events
            .filter(
                matches
            );

    }


    function downloadSelectedCalendar() {

        const events =
            calendarDownloadEvents();


        if (
            !events.length
        ) {

            showToast(
                'В выбранном разделе пока нет событий.'
            );


            return;

        }


        const names = {
            all: 'all',
            rehearsals: 'rehearsals',
            concerts: 'concerts',
            meetings: 'meetings',
            other: 'other'
        };


        downloadIcs(
            events,
            'HSE-Orchestra-' +
            (
                names[
                    selectedCalendarKey
                ]
                ||
                'calendar'
            ) +
            '.ics'
        );


        showToast(
            'Календарь скачан как .ics.'
        );

    }


    function ensureCalendarDownloadButton() {

        const actions =
            $(
                '.orch-subscribe-modal__actions'
            );


        if (
            !actions
            ||
            $('#orch-subscribe-download')
        ) {

            return;

        }


        const button =
            document.createElement(
                'button'
            );


        button.type =
            'button';


        button.className =
            'orch-subscribe-action';


        button.id =
            'orch-subscribe-download';


        button.textContent =
            'Скачать .ics';


        actions.appendChild(
            button
        );

    }


    function openAppleSubscription() {

        const httpsUrl =
            calendarSubscriptionUrl();


        const webcalUrl =
            httpsUrl.replace(
                /^https:/i,
                'webcal:'
            );


        window.location.href =
            webcalUrl;

    }


    function openGoogleSubscription() {

        const httpsUrl =
            calendarSubscriptionUrl();


        const webcalUrl =
            httpsUrl.replace(
                /^https:/i,
                'webcal:'
            );


        window.open(
            'https://calendar.google.com/calendar/render?cid=' +
            encodeURIComponent(
                webcalUrl
            ),
            '_blank',
            'noopener,noreferrer'
        );

    }


    function formatCalendarSyncDate(
        date
    ) {

        const formatted =
            new Intl
                .DateTimeFormat(
                    'ru-RU',
                    {
                        timeZone: TZ,
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }
                )
                .format(
                    date
                );


        return formatted
            .replace(
                /(\\d{1,2}\\s+)([а-яё])/u,
                (
                    _,
                    prefix,
                    monthFirst
                ) =>
                    prefix +
                    monthFirst.toUpperCase()
            );

    }


    function renderCalendarSyncMeta(
        meta
    ) {

        if (
            !meta ||
            !meta.generatedAt
        ) {

            throw new Error(
                'Некорректные данные meta.js'
            );

        }


        const generatedAt =
            new Date(
                meta.generatedAt
            );


        const formatted =
            formatCalendarSyncDate(
                generatedAt
            );


        const shortNode =
            $('#orch-calendar-sync-status');


        if (
            shortNode
        ) {

            shortNode.textContent =
                'Синхронизация календаря: ' +
                formatted +
                ' МСК';

        }


        const modalNode =
            $('#orch-calendar-updated');


        if (
            modalNode
        ) {

            const counts =
                meta.counts || {};


            const stats = [

                Number.isFinite(
                    Number(
                        counts.all
                    )
                )

                    ? Number(
                        counts.all
                    ) +
                      ' событий'

                    : '',

                Number(
                    counts.cancelled
                ) > 0

                    ? Number(
                        counts.cancelled
                    ) +
                      ' отменено'

                    : ''

            ]
            .filter(
                Boolean
            )
            .join(
                ' · '
            );


            modalNode.textContent =
                'Источник подписки обновлён: ' +
                formatted +
                ' МСК' +
                (
                    stats

                        ? ' · ' +
                          stats

                        : ''
                );

        }

    }


    function renderCalendarSyncMetaError() {

        const shortNode =
            $('#orch-calendar-sync-status');


        const modalNode =
            $('#orch-calendar-updated');


        if (
            shortNode
        ) {

            shortNode.textContent =
                'Синхронизация календаря: время обновления недоступно.';

        }


        if (
            modalNode
        ) {

            modalNode.textContent =
                'Время последнего обновления сейчас недоступно.';

        }

    }


    function loadCalendarSyncMeta() {

        if (
            window.HSE_ORCHESTRA_CALENDAR_META
        ) {

            try {

                renderCalendarSyncMeta(
                    window.HSE_ORCHESTRA_CALENDAR_META
                );

            }

            catch (
                error
            ) {

                renderCalendarSyncMetaError();

            }


            return;

        }


        const oldScript =
            document.querySelector(
                'script[data-orch-calendar-meta]'
            );


        if (
            oldScript
        ) {

            oldScript.remove();

        }


        const script =
            document.createElement(
                'script'
            );


        script.src =
            CALENDAR_SYNC_BASE +
            'meta.js?ts=' +
            Date.now();


        script.async =
            true;


        script.dataset.orchCalendarMeta =
            '1';


        script.onload =
            () => {

                try {

                    renderCalendarSyncMeta(
                        window.HSE_ORCHESTRA_CALENDAR_META
                    );

                }

                catch (
                    error
                ) {

                    renderCalendarSyncMetaError();

                }

            };


        script.onerror =
            renderCalendarSyncMetaError;


        document.head
            .appendChild(
                script
            );

    }

    /* ==========================================
       КНОПКИ
       ========================================== */

    function bindControls() {

        $(
            '[data-orch-action="prev"]'
        )
        ?.addEventListener(
            'click',
            () => {

                state.month--;


                if (
                    state.month <
                    0
                ) {

                    state.month =
                        11;

                    state.year--;

                }


                renderCalendar();

            }
        );


        $(
            '[data-orch-action="next"]'
        )
        ?.addEventListener(
            'click',
            () => {

                state.month++;


                if (
                    state.month >
                    11
                ) {

                    state.month =
                        0;

                    state.year++;

                }


                renderCalendar();

            }
        );


        $(
            '[data-orch-action="today"]'
        )
        ?.addEventListener(
            'click',
            () => {

                const now =
                    moscowParts();


                state.year =
                    now.year;


                state.month =
                    now.month;


                renderCalendar();

            }
        );


        $(
            '#orch-subscribe-open'
        )
        ?.addEventListener(
            'click',
            openSubscribeModal
        );


        $$(
            '[data-orch-subscribe-close]'
        )
        .forEach(
            node =>
                node.addEventListener(
                    'click',
                    closeSubscribeModal
                )
        );


        $$(
            '[data-calendar-key]'
        )
        .forEach(
            button =>
                button.addEventListener(
                    'click',
                    () =>
                        selectCalendar(
                            button.dataset.calendarKey
                        )
                )
        );


        ensureCalendarDownloadButton();


        $(
            '#orch-subscribe-download'
        )
        ?.addEventListener(
            'click',
            downloadSelectedCalendar
        );


        $(
            '#orch-subscribe-apple'
        )
        ?.addEventListener(
            'click',
            openAppleSubscription
        );


        $(
            '#orch-subscribe-google'
        )
        ?.addEventListener(
            'click',
            openGoogleSubscription
        );


        $(
            '#orch-subscribe-copy'
        )
        ?.addEventListener(
            'click',
            copySubscriptionUrl
        );


        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape' &&
                    !$('#orch-subscribe-modal')?.hidden
                ) {

                    closeSubscribeModal();

                }

            }
        );


        $(
            '.orch-details__close'
        )
        ?.addEventListener(
            'click',
            () => {

                $(
                    '#orch-event-details'
                )
                .hidden =
                    true;


                state.selected =
                    null;

            }
        );

    }


    /* ==========================================
       START
       ========================================== */

    async function start() {

        decorateCalendarRecord();

        bindControls();


        bindEasterEggs();

        loadCalendarSyncMeta();


        await refresh();

    }


    if (
        document.readyState ===
        'loading'
    ) {

        document
            .addEventListener(
                'DOMContentLoaded',
                start
            );

    }

    else {

        start();

    }

})();