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


    function decorateCalendarRecord() {

        const root =
            $('#orch-calendar');


        const record =
            root?.closest('.t-rec');


        record?.classList.add(
            'orch-calendar-record'
        );

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

        const AudioContextClass =
            window.AudioContext
            ||
            window.webkitAudioContext;


        if (
            !AudioContextClass
        ) {

            return;

        }


        const context =
            new AudioContextClass();


        if (
            context.state ===
            'suspended'
        ) {

            context.resume();

        }


        const notes = [
            [392.00, 0.00, 0.13],
            [392.00, 0.17, 0.13],
            [392.00, 0.34, 0.13],
            [311.13, 0.51, 0.55]
        ];


        notes.forEach(
            ([frequency, delay, duration]) => {

                const oscillator =
                    context.createOscillator();


                const gain =
                    context.createGain();


                oscillator.type =
                    'triangle';


                oscillator.frequency.value =
                    frequency;


                gain.gain.setValueAtTime(
                    0.0001,
                    context.currentTime + delay
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.08,
                    context.currentTime + delay + 0.018
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    context.currentTime + delay + duration
                );


                oscillator.connect(
                    gain
                );


                gain.connect(
                    context.destination
                );


                oscillator.start(
                    context.currentTime + delay
                );


                oscillator.stop(
                    context.currentTime + delay + duration + 0.03
                );

            }
        );


        window.setTimeout(
            () => context.close(),
            1300
        );

    }


    function playToneSequence(
        notes,
        waveform = 'sine',
        volume = 0.055
    ) {

        const AudioContextClass =
            window.AudioContext
            ||
            window.webkitAudioContext;


        if (
            !AudioContextClass
        ) {

            return;

        }


        const context =
            new AudioContextClass();


        if (
            context.state ===
            'suspended'
        ) {

            context.resume();

        }


        notes.forEach(
            ([frequency, delay, duration]) => {

                const oscillator =
                    context.createOscillator();


                const gain =
                    context.createGain();


                oscillator.type =
                    waveform;


                oscillator.frequency.value =
                    frequency;


                gain.gain.setValueAtTime(
                    0.0001,
                    context.currentTime + delay
                );


                gain.gain.exponentialRampToValueAtTime(
                    volume,
                    context.currentTime + delay + 0.014
                );


                gain.gain.exponentialRampToValueAtTime(
                    0.0001,
                    context.currentTime + delay + duration
                );


                oscillator.connect(
                    gain
                );


                gain.connect(
                    context.destination
                );


                oscillator.start(
                    context.currentTime + delay
                );


                oscillator.stop(
                    context.currentTime + delay + duration + 0.03
                );

            }
        );


        const end =
            Math.max(
                ...notes.map(
                    note =>
                        note[1] + note[2]
                )
            );


        window.setTimeout(
            () => context.close(),
            (end + 0.25) * 1000
        );

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

        playToneSequence(
            notes.map(
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
        }

    };


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
                    'Тихо считается только до первого вступления.'
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

                        monthTravelClicks++;


                        if (
                            monthTravelClicks === 4
                        ) {

                            enableVivaldiMode();


                            monthTravelClicks = 0;

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


                typedSecret =
                    (
                        typedSecret +
                        event.key.toUpperCase()
                    )
                    .slice(-24);


                const typedEgg =
                    findTypedMusicalEgg(
                        typedSecret
                    );


                if (
                    typedEgg
                ) {

                    triggerMusicalEgg(
                        typedEgg
                    );


                    typedSecret =
                        '';

                }

            }
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