(function () {
  'use strict';

  var instances = new WeakMap();
  var nextId = 0;

  var ICONS = {
    book: '<path d="M3 5.5c3-1.6 6-1.6 9 0 3-1.6 6-1.6 9 0v14c-3-1.6-6-1.6-9 0-3-1.6-6-1.6-9 0z"/><path d="M12 5.5v14M6 9h3m-3 4h3m6-4h3m-3 4h3"/>',
    billiard: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/><path d="m3 3 4 4m10 10 4 4"/>',
    cider: '<path d="M6 5h12l-1.5 14h-9zM7 10h10M10 2h4M12 2v3"/><path d="M9.5 13.5c1.4-1.2 3.6-1.2 5 0"/>',
    music: '<path d="M9 17V5l11-2v12M9 9l11-2"/><ellipse cx="5.5" cy="17.5" rx="3.5" ry="2.5"/><ellipse cx="16.5" cy="15.5" rx="3.5" ry="2.5"/>',
    night: '<path d="M3 20V9a3 3 0 0 1 6 0v11m0 0V6a3 3 0 0 1 6 0v14m0 0V9a3 3 0 0 1 6 0v11M2 20h20M5 13h2m4-4h2m4 4h2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1.2 6M4 4v6h6"/>',
    seal: '<path d="m12 2 2.6 2.3 3.4-.2.8 3.3 2.8 2-1.2 3.2.7 3.4-3.1 1.5-1.3 3.1-3.4-.4L12 22l-2.9-1.8-3.4.4-1.3-3.1-3.1-1.5.7-3.4L.8 9.4l2.8-2 .8-3.3 3.4.2z"/>'
  };

  var CASES = [
    {
      place: 'Sonya', icon: 'book', stamp: 'Литературный след',
      title: 'Чужое имя в гостиничной книге',
      story: 'В холле Sonya вы находите страницу без номера комнаты. На полях записано: «Ищи автора. Его Петербург полон тревожных улиц, двойников и вопросов, от которых не уснуть». Первый штамп спрятан между строк.',
      question: 'Чьё имя откроет первую страницу паспорта ночи?',
      clues: [
        { label: 'Прочитать записку', text: 'На обороте различимы два слова: «Преступление» и «наказание».' },
        { label: 'Рассмотреть обложку', text: 'Это литературный ключ к теме отеля Sonya. Нужен автор, а не имя героини.' }
      ],
      options: ['Николай Гоголь', 'Фёдор Достоевский', 'Владимир Набоков'], correct: 1,
      errors: ['Гоголь тоже знал странный Петербург. Но название из записки принадлежит другому автору.', '', 'Набоков оставил городу свои воспоминания. А здесь след ведёт к «Преступлению и наказанию».'],
      answer: 'Вы нашли литературный ключ: Достоевский — тема Sonya. В паспорте появляется первый штамп.',
      note: 'Сменитесь ролями: теперь второй читает улику, первый предлагает версию.'
    },
    {
      place: 'Frans', icon: 'billiard', stamp: 'Точный удар',
      title: 'Мел на тёмном рукаве',
      story: 'На следующей карточке — зелёный остров, белый круг и тонкая линия, уходящая к углу. На вашем рукаве осталась пыль от мела. «Здесь двое могут продолжить разговор без единого слова», — приписано снизу.',
      question: 'Какую игру во Frans зашифровали в карточке?',
      clues: [
        { label: 'Осмотреть след мела', text: 'Мелом натирают кончик длинного деревянного инструмента. Сам рисунок похож на вид сверху.' },
        { label: 'Проверить зелёный остров', text: 'Это сукно. На нём есть шары, а по краям — лузы.' }
      ],
      options: ['Дартс', 'Кикер', 'Бильярд'], correct: 2,
      errors: ['У дартса есть мишень, но нет сукна и шаров. Проверьте вторую улику.', 'Для кикера нужны фигурки игроков и ручки. Мел и лузы относятся к другой игре.', ''],
      answer: 'Точный удар: это бильярд во Frans. Ещё один штамп в кармане — и ещё одна идея для вечера вдвоём.',
      note: 'Перед следующей карточкой назовите друг другу одну версию. Потом сверяйтесь с уликами.'
    },
    {
      place: 'Sidreria', icon: 'cider', stamp: 'Найденный адрес',
      title: 'Квитанция с яблочным следом',
      story: 'От квитанции сохранились бокал сидра, дом № 30 и часть названия улицы. Почерк не разобрать, но кто-то заботливо дописал: «Название зелёное, а до леса идти не придётся». Осталось вернуть адрес на место.',
      question: 'Какой адрес нужно вписать в карточку Sidreria?',
      clues: [
        { label: 'Повернуть квитанцию', text: 'Внизу стоит название Sidreria. Вы ищете именно её, а не последнюю точку ночного маршрута.' },
        { label: 'Расшифровать зелёное слово', text: 'Начало названия улицы напоминает о мхе. Дом на квитанции — 30.' }
      ],
      options: ['Моховая, 30', 'Соляной переулок, 14', 'Конюшенная площадь, 2В'], correct: 0,
      errors: ['', 'Соляной, 14 — адрес «Сумбура». На этой квитанции другое место и дом № 30.', 'Конюшенная, 2В — финальная ночная точка VNVNC. Квитанция Sidreria ведёт на Моховую.'],
      answer: 'Адрес восстановлен: Sidreria, Моховая, 30. В паспорте уже три штампа.',
      note: 'Поменяйтесь ролями ещё раз. Следующая улика звучит, а не выглядит.'
    },
    {
      place: 'Сумбур', icon: 'music', stamp: 'Узнанная мелодия',
      title: 'Номер, который оказался песней',
      story: 'Из конверта выпадает карточка с пустыми клетками. Ведущий собирается назвать число, но вместо этого включается знакомый припев. Над дверью горит «21:00». Здесь выигрывает тот, кто слушает внимательно.',
      question: 'Что начинается в «Сумбуре» в 21:00?',
      clues: [
        { label: 'Прочитать правила на полях', text: 'Песни нужно узнавать, а соответствующие клетки — закрывать. Самому петь не требуется.' },
        { label: 'Сверить часы', text: 'В анонсе на 31 октября указано музыкальное лото в 21:00. Это отдельная игра, а не просто фоновая музыка.' }
      ],
      options: ['Караоке с открытым микрофоном', 'Музыкальное лото', 'Ночной диджей-сет'], correct: 1,
      errors: ['Для караоке нужен ваш голос. В этой игре нужны узнавание песен и карточка с клетками.', '', 'Диджей может включать знакомые треки, но карточки и закрытые клетки выдают другую механику.'],
      answer: 'Верно: музыкальное лото в «Сумбуре» начинается в 21:00. Четвёртый штамп звучит как знакомый припев.',
      note: 'Финальная карточка — общая. Соберите цифры вместе, прежде чем выбирать ответ.'
    },
    {
      place: 'VNVNC', icon: 'night', stamp: 'Ночной пароль',
      title: 'Пароль у трёх дверей',
      story: 'На последней печати стёрлись три числа. Остались подсказки: «Одна сцена на каждого из вас — и ещё одна про запас. Баров вдвое больше. Двери открываются за час до полуночи». Соберите пароль финальной точки.',
      question: 'Какая комбинация соответствует ночи в VNVNC?',
      clues: [
        { label: 'Посчитать двери', text: 'Вас двое. Две сцены плюс одна запасная — три. Вдвое больше баров — шесть.' },
        { label: 'Настроить часы', text: 'Час до полуночи — 23:00. В анонсе VNVNC на 31 октября именно это время начала.' }
      ],
      options: ['2 сцены, 4 бара, начало в 22:00', '1 сцена, 2 бара, начало в 21:00', '3 сцены, 6 баров, начало в 23:00'], correct: 2,
      errors: ['На каждого из двоих нужна сцена, но ещё одна осталась про запас. Попробуйте посчитать заново.', 'Одной сцены не хватит даже на первую часть шифра. Проверьте улику с дверями.', ''],
      answer: 'Пароль принят: три сцены, шесть баров, начало в 23:00. Пятый штамп замыкает ночной паспорт.',
      note: ''
    }
  ];

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function icon(name, className) {
    return '<svg class="ng-icon ' + (className || '') + '" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (ICONS[name] || ICONS.seal) + '</svg>';
  }

  window.initNightGame = function (container) {
    if (typeof container === 'string') container = document.querySelector(container);
    if (!container || container.nodeType !== 1) throw new TypeError('initNightGame: нужен DOM-контейнер игры.');
    if (instances.has(container)) instances.get(container).destroy();

    var id = 'night-game-' + (++nextId);
    var state;
    var destroyed = false;
    var shell;
    var stage;
    var progress;
    var meter;
    var stamps;

    function resetState() {
      state = { phase: 'intro', index: 0, collected: 0, selected: null, wrong: [], clues: [false, false], attempts: 0, firstTry: 0, revision: 0 };
    }

    function buildShell() {
      container.innerHTML = '<section class="ng-game" aria-labelledby="' + id + '-title">' +
        '<header class="ng-header"><div><p class="ng-kicker">Пять дел одной ночи</p><h3 id="' + id + '-title">Ночной детектив</h3></div>' +
        '<p class="ng-progress-label" aria-live="polite" aria-atomic="true">Штампы: <span data-ng-count>0</span> из 5</p></header>' +
        '<div class="ng-meter" role="progressbar" aria-label="Собрано штампов" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><span class="ng-meter-fill"></span></div>' +
        '<ol class="ng-passport" aria-label="Паспорт ночи">' + CASES.map(function (item, index) {
          return '<li class="ng-stamp" data-ng-stamp="' + index + '"><span class="ng-stamp-mark">' + icon(item.icon) + '</span><span class="ng-stamp-name">' + escapeHTML(item.place) + '</span><span class="ng-sr-only" data-ng-stamp-status>Ещё не найден</span></li>';
        }).join('') + '</ol><div class="ng-stage"></div></section>';
      shell = container.querySelector('.ng-game');
      stage = container.querySelector('.ng-stage');
      progress = container.querySelector('[data-ng-count]');
      meter = container.querySelector('.ng-meter');
      stamps = Array.from(container.querySelectorAll('[data-ng-stamp]'));
      renderIntro();
    }

    function actionAttributes(action) {
      return ' data-ng-action="' + action + '" data-ng-revision="' + state.revision + '"';
    }

    function updatePassport() {
      progress.textContent = String(state.collected);
      meter.setAttribute('aria-valuenow', String(state.collected));
      meter.style.setProperty('--ng-progress', String(state.collected / CASES.length));
      stamps.forEach(function (stamp, index) {
        var collected = index < state.collected;
        var current = state.phase === 'question' && index === state.index;
        stamp.classList.toggle('is-collected', collected);
        stamp.classList.toggle('is-current', current);
        if (current) stamp.setAttribute('aria-current', 'step');
        else stamp.removeAttribute('aria-current');
        stamp.querySelector('[data-ng-stamp-status]').textContent = collected ? 'Штамп найден' : current ? 'Текущее дело' : 'Ещё не найден';
      });
      shell.dataset.phase = state.phase;
    }

    function focusHeading() {
      var heading = stage.querySelector('[data-ng-focus]');
      if (!heading) return;
      heading.focus({ preventScroll: true });
      var headerHeight = parseFloat(window.getComputedStyle(document.documentElement).getPropertyValue('--head-height')) || 0;
      var bounds = heading.getBoundingClientRect();
      if (bounds.top < headerHeight + 18 || bounds.bottom > window.innerHeight - 18) {
        // Global scroll-padding accounts for the sticky header. Instant avoids
        // inheriting the page's smooth scrolling during a game state change.
        heading.scrollIntoView({ block: 'start', behavior: 'instant' });
      }
    }

    function renderIntro() {
      state.revision += 1;
      stage.innerHTML = '<div class="ng-intro"><div class="ng-intro-seal">' + icon('seal') + '</div>' +
        '<h4 data-ng-focus tabindex="-1">В паспорте ночи не хватает пяти штампов</h4>' +
        '<p class="ng-story">Кто-то перемешал гостиничную книгу, бильярдный мел, адрес, мелодию и ночной пароль. Соберите улики и верните каждой остановке свой знак.</p>' +
        '<div class="ng-pair-note"><p><strong>Попробуйте вдвоём.</strong> Один читает карточку вслух, второй предлагает версию. В следующем деле поменяйтесь. Все улики уже здесь.</p><p>Пять загадок, около 5–7 минут без спешки. Таймера нет, ошибаться можно.</p></div>' +
        '<button class="ng-primary" type="button"' + actionAttributes('start') + '>Открыть первое дело ' + icon('arrow', 'ng-arrow') + '</button>' +
        '<p class="ng-keyboard-help">Выберите версию и нажмите «Проверить версию». С клавиатуры: цифры 1–3 и Enter. Подсказки доступны кнопками.</p></div>';
      updatePassport();
    }

    function renderCase(moveFocus) {
      var item = CASES[state.index];
      state.revision += 1;
      stage.innerHTML = '<div class="ng-case"><div class="ng-case-heading"><span class="ng-case-place">' + icon(item.icon) + escapeHTML(item.place) + '</span><span class="ng-case-number">Дело ' + (state.index + 1) + ' из 5</span></div>' +
        '<h4 id="' + id + '-case-title" data-ng-focus tabindex="-1">' + escapeHTML(item.title) + '</h4>' +
        '<p class="ng-story">' + escapeHTML(item.story) + '</p>' +
        '<div class="ng-clues" aria-label="Дополнительные улики">' + item.clues.map(function (clue, index) {
          return '<div class="ng-clue"><button class="ng-clue-toggle" type="button" aria-expanded="false" aria-controls="' + id + '-clue-' + index + '" data-ng-clue="' + index + '"' + actionAttributes('clue') + '><span>Улика ' + (index + 1) + '</span>' + escapeHTML(clue.label) + icon('arrow', 'ng-arrow') + '</button><p id="' + id + '-clue-' + index + '" class="ng-clue-text" hidden>' + escapeHTML(clue.text) + '</p></div>';
        }).join('') + '</div>' +
        '<fieldset class="ng-choices"><legend>' + escapeHTML(item.question) + '</legend><div class="ng-options">' + item.options.map(function (option, index) {
          return '<button class="ng-option" type="button" aria-pressed="false" aria-describedby="' + id + '-feedback" data-ng-option="' + index + '"' + actionAttributes('answer') + '><span class="ng-option-key" aria-hidden="true">' + (index + 1) + '</span><span>' + escapeHTML(option) + '</span><span class="ng-option-result" aria-hidden="true"></span></button>';
        }).join('') + '</div></fieldset>' +
        '<div id="' + id + '-feedback" class="ng-feedback" role="status" aria-live="polite" aria-atomic="true"><p>Выберите версию, затем нажмите «Проверить версию». Если сомневаетесь, откройте улики.</p></div>' +
        '<div class="ng-case-footer"><p class="ng-keyboard-help">Клавиши 1–3: выбрать. Enter: проверить.</p><button class="ng-primary ng-confirm" type="button" disabled' + actionAttributes('confirm') + '>Проверить версию ' + icon('arrow', 'ng-arrow') + '</button><button class="ng-primary ng-next" type="button" hidden' + actionAttributes('next') + '>' + (state.index === CASES.length - 1 ? 'Открыть паспорт' : 'Следующее дело') + ' ' + icon('arrow', 'ng-arrow') + '</button></div></div>';
      updatePassport();
      if (moveFocus) focusHeading();
    }

    function selectAnswer(index, moveFocus) {
      if (state.phase !== 'question' || state.wrong.indexOf(index) !== -1) return;
      state.selected = index;
      stage.querySelectorAll('[data-ng-option]').forEach(function (button) {
        var selected = Number(button.dataset.ngOption) === index;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
        if (selected && moveFocus) button.focus({ preventScroll: true });
      });
      stage.querySelector('.ng-confirm').disabled = false;
    }

    function answer(index) {
      if (state.phase !== 'question' || state.wrong.indexOf(index) !== -1 || index < 0 || index > 2) return;
      var item = CASES[state.index];
      var feedback = stage.querySelector('.ng-feedback');
      var button = stage.querySelector('[data-ng-option="' + index + '"]');
      var hadAnswerFocus = document.activeElement === button || document.activeElement === stage.querySelector('.ng-confirm');
      selectAnswer(index, false);
      state.attempts += 1;
      if (index !== item.correct) {
        state.wrong.push(index);
        state.selected = null;
        button.disabled = true;
        button.classList.remove('is-selected');
        button.classList.add('is-wrong');
        button.setAttribute('aria-pressed', 'false');
        button.querySelector('.ng-option-result').textContent = 'Не этот след';
        feedback.className = 'ng-feedback is-error';
        feedback.innerHTML = '<p><strong>Пока не сходится.</strong> ' + escapeHTML(item.errors[index]) + '</p>';
        stage.querySelector('.ng-confirm').disabled = true;
        // A disabled answer must not strand keyboard focus.
        var available = stage.querySelector('[data-ng-option]:not([disabled])');
        if (available && hadAnswerFocus) available.focus({ preventScroll: true });
        return;
      }
      state.phase = 'solved';
      state.collected += 1;
      if (state.attempts === 1) state.firstTry += 1;
      stage.querySelectorAll('[data-ng-option]').forEach(function (option) { option.disabled = true; });
      button.classList.add('is-correct');
      button.querySelector('.ng-option-result').innerHTML = icon('check') + '<span>Верно</span>';
      feedback.className = 'ng-feedback is-success';
      feedback.innerHTML = '<p class="ng-stamp-earned">' + icon('check') + '<strong>' + escapeHTML(item.stamp) + '</strong></p><p>' + escapeHTML(item.answer) + '</p>' + (item.note ? '<p class="ng-pair-turn">' + escapeHTML(item.note) + '</p>' : '');
      stage.querySelector('.ng-confirm').hidden = true;
      stage.querySelector('.ng-next').hidden = false;
      // Keyboard users can continue with Enter without tabbing out of the answer group.
      if (hadAnswerFocus) {
        stage.querySelector('.ng-next').focus({ preventScroll: true });
      }
      updatePassport();
    }

    function renderWin() {
      state.phase = 'complete';
      state.revision += 1;
      stage.innerHTML = '<div class="ng-win"><div class="ng-win-seal">' + icon('seal') + icon('check') + '</div><p class="ng-win-label">Паспорт ночи собран</p><h4 data-ng-focus tabindex="-1">Пять штампов. Одна история на двоих.</h4>' +
        '<p class="ng-story">Литературный ключ Sonya, бильярд во Frans, адрес Sidreria, мелодия «Сумбура» и три двери VNVNC снова на своих местах. Дело закрыто — вечер только начинается.</p>' +
        '<p class="ng-win-score">С первой попытки: <strong>' + state.firstTry + ' из 5</strong>. Все пять штампов ваши.</p>' +
        '<button class="ng-primary" type="button"' + actionAttributes('restart') + '>Пройти ещё раз ' + icon('reset') + '</button><p class="ng-keyboard-help">При повторе можно поменяться ролями.</p></div>';
      updatePassport();
      focusHeading();
    }

    function next() {
      if (state.phase !== 'solved') return;
      if (state.index === CASES.length - 1) return renderWin();
      state.index += 1;
      state.phase = 'question';
      state.selected = null;
      state.wrong = [];
      state.clues = [false, false];
      state.attempts = 0;
      renderCase(true);
    }

    function onClick(event) {
      var button = event.target.closest && event.target.closest('[data-ng-action]');
      if (!button || !container.contains(button) || button.disabled || destroyed) return;
      if (Number(button.dataset.ngRevision) !== state.revision) return;
      var action = button.dataset.ngAction;
      if (action === 'start' && state.phase === 'intro') {
        state.phase = 'question'; renderCase(true);
      } else if (action === 'restart' && state.phase === 'complete') {
        resetState(); buildShell(); focusHeading();
      } else if (action === 'clue' && (state.phase === 'question' || state.phase === 'solved')) {
        var clueIndex = Number(button.dataset.ngClue);
        state.clues[clueIndex] = !state.clues[clueIndex];
        button.setAttribute('aria-expanded', String(state.clues[clueIndex]));
        document.getElementById(button.getAttribute('aria-controls')).hidden = !state.clues[clueIndex];
      } else if (action === 'answer') {
        selectAnswer(Number(button.dataset.ngOption), false);
      } else if (action === 'confirm' && state.selected !== null) {
        answer(state.selected);
      } else if (action === 'next') {
        next();
      }
    }

    function onKeyDown(event) {
      if (destroyed || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.repeat) {
        if (event.key === 'Enter' || /^[123]$/.test(event.key)) event.preventDefault();
        return;
      }
      var target = event.target;
      if (target && (target.matches('input, textarea, select') || target.isContentEditable)) return;
      if (state.phase === 'question' && /^[123]$/.test(event.key)) {
        event.preventDefault();
        selectAnswer(Number(event.key) - 1, true);
      } else if (state.phase === 'question' && event.key === 'Enter' && state.selected !== null) {
        // Leave Enter on clue controls to their native button behavior.
        if (target.closest('[data-ng-action="clue"]')) return;
        event.preventDefault();
        var focusedOption = target.closest('[data-ng-option]');
        if (focusedOption && Number(focusedOption.dataset.ngOption) !== state.selected) {
          selectAnswer(Number(focusedOption.dataset.ngOption), false);
          return;
        }
        answer(state.selected);
      }
    }

    resetState();
    buildShell();
    container.addEventListener('click', onClick);
    container.addEventListener('keydown', onKeyDown);

    var controller = {
      restart: function () {
        if (destroyed) return;
        resetState(); buildShell(); focusHeading();
      },
      getState: function () {
        return { phase: state.phase, caseIndex: state.index, stamps: state.collected, firstTry: state.firstTry, selected: state.selected, mistakesHere: state.wrong.length };
      },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        container.removeEventListener('click', onClick);
        container.removeEventListener('keydown', onKeyDown);
        container.innerHTML = '';
        if (instances.get(container) === controller) instances.delete(container);
      }
    };
    instances.set(container, controller);
    return controller;
  };
}());
