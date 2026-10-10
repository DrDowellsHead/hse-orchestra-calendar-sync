(function () {

    'use strict';


    /*
     * СТАБИЛЬНЫЙ ЗАГРУЗЧИК КАЛЕНДАРЯ
     *
     * Tilda продолжает подключать:
     *   calendar.js?v=4.4
     *
     * Этот файл больше не содержит бизнес-логику календаря.
     * Он получает актуальную версию ассетов через manifest
     * и подгружает свежие CSS + calendar.runtime.js.
     *
     * Поэтому дальнейшие изменения JS/CSS не требуют
     * редактирования HTML/T123.
     */

    if (
        window.__HSE_ORCHESTRA_CALENDAR_BOOTSTRAP__
    ) {

        return;

    }


    window.__HSE_ORCHESTRA_CALENDAR_BOOTSTRAP__ =
        true;


    const BASE =
        'https://drdowellshead.github.io/hse-orchestra-calendar-sync/';


    function showLoadError() {

        const empty =
            document.querySelector(
                '#orch-calendar-empty'
            );


        if (
            empty
        ) {

            empty.hidden =
                false;


            empty.textContent =
                'Не удалось загрузить календарь. Обновите страницу.';

        }


        console.error(
            '[HSE Orchestra Calendar] Не удалось загрузить runtime-ассеты.'
        );

    }


    function loadRuntime(
        version
    ) {

        if (
            window.__HSE_ORCHESTRA_CALENDAR_RUNTIME_REQUESTED__
        ) {

            return;

        }


        window.__HSE_ORCHESTRA_CALENDAR_RUNTIME_REQUESTED__ =
            true;


        const safeVersion =
            encodeURIComponent(
                String(
                    version
                    ||
                    Date.now()
                )
            );


        const style =
            document.createElement(
                'link'
            );


        style.rel =
            'stylesheet';


        style.href =
            BASE +
            'assets/calendar.css?v=' +
            safeVersion;


        style.dataset.orchRuntimeStyle =
            safeVersion;


        document.head
            .appendChild(
                style
            );


        const script =
            document.createElement(
                'script'
            );


        script.src =
            BASE +
            'assets/calendar.runtime.js?v=' +
            safeVersion;


        script.async =
            false;


        script.dataset.orchRuntime =
            safeVersion;


        script.onerror =
            showLoadError;


        document.head
            .appendChild(
                script
            );

    }


    function loadManifest() {

        const manifestScript =
            document.createElement(
                'script'
            );


        manifestScript.src =
            BASE +
            'asset-manifest.js?ts=' +
            Date.now();


        manifestScript.async =
            true;


        manifestScript.onload =
            () => {

                const manifest =
                    window.HSE_ORCHESTRA_ASSET_MANIFEST
                    ||
                    {};


                loadRuntime(
                    manifest.version
                    ||
                    Date.now()
                );

            };


        manifestScript.onerror =
            () => {

                /*
                 * Даже если manifest временно недоступен,
                 * пробуем runtime с уникальным query string,
                 * чтобы не зависеть от старого браузерного кэша.
                 */
                loadRuntime(
                    'fallback-' +
                    Date.now()
                );

            };


        document.head
            .appendChild(
                manifestScript
            );

    }


    loadManifest();

})();
