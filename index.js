const TMDB_API_KEY = '0a53edb0be7fe20d18cc982a4a16f8cb';

const catalogSection = document.getElementById("catalog-section");
const mainContent = document.getElementById("main-content");
const detailsPage = document.getElementById("movie-details-page");
const movieInput = document.getElementById("movie-input");
const searchResults = document.getElementById("search-results");

const heroWatchBtn = document.getElementById("hero-watch-btn");
const detailsWatchBtn = document.getElementById("details-watch-btn");
const detailsFavBtn = document.getElementById("details-fav-btn");

const iframe = document.getElementById("youtube-player");
const trailerModal = document.getElementById("trailer-modal");

let currentMovieDetails = null; 

// --- ГЛОБАЛЬНЫЕ СОБЫТИЯ ---
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        searchResults.style.display = 'none';
    }
});

window.onload = function() {
    checkAuthStatus();
    loadHeroMovie();
    loadAllRows();
    renderGenres();
    loadFavorites(); 
};

// --- АВТОРИЗАЦИЯ И ПРОФИЛЬ ---
function getCurrentUser() {
    try {
        if (localStorage.getItem('isLoggedIn') === 'true') {
            return JSON.parse(localStorage.getItem('user'));
        }
    } catch(e) {
        console.error("Ошибка чтения пользователя", e);
    }
    return null;
}

function checkAuthStatus() {
    const authContainer = document.getElementById('auth-buttons-container');
    const user = getCurrentUser();

    if (user) {
        authContainer.innerHTML = `
            <div class="user-profile">
                <button class="btn-profile" onclick="window.location.href='profile.html'">
                    <i class="fas fa-user-cog"></i> Профиль
                </button>
                <span class="user-name">${user.username}</span>
                <button class="btn-logout" onclick="processLogout()">Выход</button>
            </div>
        `;
    }
}

function processLogout() {
    localStorage.removeItem('isLoggedIn');
    window.location.reload();
}

// --- ЛОГИКА ИЗБРАННОГО (ПЕРЕПИСАНО: ПРИВЯЗКА К EMAIL ПОЛЬЗОВАТЕЛЯ) ---
function getFavorites() {
    const user = getCurrentUser();
    if (!user) return []; // Если не вошел, список пуст
    
    try {
        // Ищем избранное конкретно для этого пользователя
        const favs = localStorage.getItem(`favorites_${user.email}`);
        return favs ? JSON.parse(favs) : [];
    } catch (e) {
        return [];
    }
}

function saveFavorites(favs) {
    const user = getCurrentUser();
    if (user) {
        localStorage.setItem(`favorites_${user.email}`, JSON.stringify(favs));
    }
}

function toggleFavorite() {
    if (!currentMovieDetails) return;
    
    const user = getCurrentUser();
    if (!user) {
        alert("Пожалуйста, войдите в аккаунт, чтобы сохранять фильмы в избранное.");
        return;
    }

    let favs = getFavorites();
    const existingIndex = favs.findIndex(m => m.id === currentMovieDetails.id);

    if (existingIndex !== -1) {
        // Удаляем
        favs.splice(existingIndex, 1);
        detailsFavBtn.classList.remove('active');
        document.getElementById('fav-btn-text').innerText = 'В избранное';
    } else {
        // Добавляем
        favs.push({
            id: currentMovieDetails.id,
            title: currentMovieDetails.title,
            poster_path: currentMovieDetails.poster_path,
            vote_average: currentMovieDetails.vote_average
        });
        detailsFavBtn.classList.add('active');
        document.getElementById('fav-btn-text').innerText = 'В избранном';
    }

    saveFavorites(favs); // Сохраняем в ключ конкретного пользователя
    loadFavorites();     // Сразу обновляем интерфейс на главной
}

if (detailsFavBtn) {
    detailsFavBtn.onclick = toggleFavorite;
}

function loadFavorites() {
    const user = getCurrentUser();
    const favSection = document.getElementById('favorites-section');
    const favRow = document.getElementById('favorites-row');

    if (!user) {
        favSection.style.display = 'none';
        favRow.innerHTML = '';
        return;
    }

    const favs = getFavorites();
    if (favs.length > 0) {
        favSection.style.display = 'block';
        favRow.innerHTML = '';
        // .reverse() выводит последние добавленные слева направо
        [...favs].reverse().forEach(movie => {
            favRow.appendChild(createMovieCard(movie));
        });
    } else {
        favSection.style.display = 'none';
        favRow.innerHTML = '';
    }
}

// --- ФИЛЬТРЫ ПО ЖАНРАМ ---
const genresList = [
    {id: 28, name: "Боевик"}, {id: 12, name: "Приключения"}, 
    {id: 16, name: "Мультфильм"}, {id: 35, name: "Комедия"},
    {id: 80, name: "Криминал"}, {id: 18, name: "Драма"},
    {id: 14, name: "Фэнтези"}, {id: 27, name: "Ужасы"},
    {id: 878, name: "Фантастика"}, {id: 53, name: "Триллер"}
];

function renderGenres() {
    const container = document.getElementById('genre-filters');
    if (!container) return;
    
    const allBtn = document.createElement('button');
    allBtn.className = 'genre-btn active';
    allBtn.innerText = 'Все';
    allBtn.onclick = () => filterByGenre(null, allBtn, 'Все');
    container.appendChild(allBtn);

    genresList.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'genre-btn';
        btn.innerText = genre.name;
        btn.onclick = () => filterByGenre(genre.id, btn, genre.name);
        container.appendChild(btn);
    });
}

async function filterByGenre(genreId, buttonElement, genreName) {
    document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
    if (buttonElement) buttonElement.classList.add('active');

    const standardRows = document.getElementById('standard-rows');
    const resultsSection = document.getElementById('genre-results-section');
    const resultsTitle = document.getElementById('genre-results-title');

    if (!genreId) {
        standardRows.style.display = 'block';
        resultsSection.style.display = 'none';
        return;
    }

    standardRows.style.display = 'none';
    resultsSection.style.display = 'block';
    resultsTitle.innerText = `Жанр: ${genreName}`;
    
    await fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&language=ru-RU`, 'genre-results-row');
}

// --- БАЗОВЫЕ ФУНКЦИИ TMDB И РЕНДЕРИНГ ---
function formatRating(rating) {
    if (rating === undefined || rating === null || rating === 0) return 'N/A';
    return rating.toFixed(1);
}

function createMovieCard(movie) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    const poster = movie.poster_path 
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
        : 'https://via.placeholder.com/200x300?text=Нет+постера';
    
    card.innerHTML = `
        <img src="${poster}" alt="${movie.title || 'Постер'}" loading="lazy">
        <div class="movie-info">
            <h4>${movie.title || 'Без названия'}</h4>
            <span>⭐ ${formatRating(movie.vote_average)}</span>
        </div>
    `;
    card.onclick = () => showMovieDetails(movie.id);
    return card;
}

async function loadAllRows() {
    fetchMovies(`https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_API_KEY}&language=ru-RU`, 'trending-row');
    fetchMovies(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=KZ&language=ru-RU`, 'kazakh-row');
    fetchMovies(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_API_KEY}&language=ru-RU`, 'top-rated-row');
}

async function fetchMovies(url, rowId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Сетевая ошибка API");
        const data = await response.json();
        
        const container = document.getElementById(rowId);
        if (!container) return;
        
        container.innerHTML = ''; 
        if (data.results && data.results.length > 0) {
            data.results.forEach(movie => {
                container.appendChild(createMovieCard(movie));
            });
        } else {
            container.innerHTML = '<p style="color:var(--text-muted); padding: 10px;">Ничего не найдено</p>';
        }
    } catch (error) {
        console.error("Ошибка при загрузке ряда:", error);
    }
}

async function loadHeroMovie() {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=ru-RU`);
        const data = await res.json();
        const movie = data.results?.find(m => m.backdrop_path) || data.results[0];
        
        if (movie && movie.backdrop_path) {
            document.querySelector('.hero-section').style.backgroundImage = `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`;
        }
        
        document.getElementById('movie-title').innerText = movie?.title || 'Кино-хит';
        document.getElementById('movie-desc').innerText = movie?.overview ? (movie.overview.substring(0, 150) + '...') : 'Описание отсутствует.';
        document.getElementById('movie-rating').innerText = `⭐ ${formatRating(movie?.vote_average)}`;

        if (heroWatchBtn && movie) {
            heroWatchBtn.onclick = () => playTrailer(movie.id);
        }
    } catch (e) { 
        console.error("Ошибка загрузки баннера:", e); 
    }
}

let searchTimeout = null;
movieInput.oninput = function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length > 2) {
        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}&language=ru-RU`);
                const data = await res.json();
                showSearchResults(data.results);
            } catch(e) {
                console.error("Ошибка поиска", e);
            }
        }, 400); 
    } else {
        searchResults.style.display = 'none';
    }
};

function showSearchResults(movies) {
    searchResults.innerHTML = '';
    if (!movies || movies.length === 0) { 
        searchResults.style.display = 'none'; 
        return; 
    }
    
    movies.slice(0, 5).forEach(movie => {
        const div = document.createElement('div');
        div.className = 'search-item';
        const imgPath = movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : 'https://via.placeholder.com/92x138?text=N/A';
        const year = movie.release_date ? movie.release_date.split('-')[0] : '';
        
        div.innerHTML = `<img src="${imgPath}" alt=""><div><p>${movie.title}</p><small>${year}</small></div>`;
        div.onclick = () => { 
            showMovieDetails(movie.id); 
            searchResults.style.display = 'none'; 
            movieInput.value = ''; 
        };
        searchResults.appendChild(div);
    });
    searchResults.style.display = 'block';
}

async function showMovieDetails(id) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}&language=ru-RU`);
        const movie = await res.json();
        currentMovieDetails = movie;

        // Проверяем статус избранного для текущего пользователя
        const favs = getFavorites();
        if (favs.some(m => m.id === movie.id)) {
            detailsFavBtn.classList.add('active');
            document.getElementById('fav-btn-text').innerText = 'В избранном';
        } else {
            detailsFavBtn.classList.remove('active');
            document.getElementById('fav-btn-text').innerText = 'В избранное';
        }

        mainContent.style.display = 'none';
        detailsPage.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' }); 

        document.getElementById('movie-img').src = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=Нет+постера';
        document.getElementById('details-title').innerText = movie.title;
        document.getElementById('details-desc').innerText = movie.overview || "Описание пока не добавлено.";
        document.getElementById('details-rating').innerText = `⭐ Рейтинг: ${formatRating(movie.vote_average)}`;
        document.getElementById('details-date').innerText = `Дата выхода: ${movie.release_date || 'Неизвестно'}`;

        const castContainer = document.getElementById('cast-container');
        castContainer.innerHTML = '';
        try {
            const creditsRes = await fetch(`https://api.themoviedb.org/3/movie/${id}/credits?api_key=${TMDB_API_KEY}&language=ru-RU`);
            const creditsData = await creditsRes.json();
            if (creditsData.cast && creditsData.cast.length > 0) {
                creditsData.cast.slice(0, 10).forEach(actor => {
                    const actorDiv = document.createElement('div');
                    actorDiv.className = 'actor-card';
                    const profilePath = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/120x160?text=Нет+фото';
                    actorDiv.innerHTML = `<img src="${profilePath}" alt="${actor.name}" loading="lazy"><p class="actor-name">${actor.name}</p><p class="actor-role">${actor.character}</p>`;
                    castContainer.appendChild(actorDiv);
                });
            } else {
                castContainer.innerHTML = '<p style="color:var(--text-muted)">Нет информации об актерах.</p>';
            }
        } catch (e) {
            console.error("Ошибка загрузки актеров:", e);
        }

        const similarSection = document.querySelector('.similar-section-bottom');
        const similarRow = document.getElementById('similar-movies-row');
        similarRow.innerHTML = '';
        try {
            const simRes = await fetch(`https://api.themoviedb.org/3/movie/${id}/similar?api_key=${TMDB_API_KEY}&language=ru-RU`);
            const simData = await simRes.json();
            if (simData.results && simData.results.length > 0) {
                similarSection.style.display = 'block';
                simData.results.slice(0, 15).forEach(m => similarRow.appendChild(createMovieCard(m)));
            } else {
                similarSection.style.display = 'none';
            }
        } catch (e) {
            similarSection.style.display = 'none';
        }

        if (detailsWatchBtn) detailsWatchBtn.onclick = () => playTrailer(id);
    } catch (e) { 
        console.error("Ошибка загрузки деталей фильма:", e); 
    }
}

function showCatalog() {
    mainContent.style.display = 'block';
    detailsPage.style.display = 'none';
}

function scrollToSection(id) {
    showCatalog();
    setTimeout(() => {
        const el = document.getElementById(id);
        if(el) {
            const offset = 80; 
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({top: top, behavior: 'smooth'});
        }
    }, 100);
}

// --- ТРЕЙЛЕРЫ ---
async function playTrailer(id) {
    try {
        const resRu = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}&language=ru-RU`);
        const dataRu = await resRu.json();
        let trailer = dataRu.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        if (!trailer) {
            const resEn = await fetch(`https://api.themoviedb.org/3/movie/${id}/videos?api_key=${TMDB_API_KEY}&language=en-US`);
            const dataEn = await resEn.json();
            trailer = dataEn.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube') || (dataEn.results && dataEn.results[0]);
        }
        
        if (trailer && trailer.key) {
            iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1`;
            trailerModal.style.display = 'flex';
        } else {
            showAIResponse("К сожалению, трейлер для этого фильма не найден в базе данных.");
        }
    } catch (e) { 
        console.error("Ошибка при поиске трейлера:", e); 
        showAIResponse("Не удалось загрузить трейлер из-за технической ошибки.");
    }
}

document.getElementById('close-trailer').onclick = () => { trailerModal.style.display = 'none'; iframe.src = ''; };
trailerModal.onclick = (e) => { if (e.target === trailerModal) { trailerModal.style.display = 'none'; iframe.src = ''; } };

// --- ЛОГИКА ИИ ПОМОЩНИКА ---
const apiKey = "AIzaSyAwtD0kLlbENBig4BDFx2svgShGBaAEvK8"; 

function toggleAIChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    chatWindow.classList.toggle('hidden');
    if(!chatWindow.classList.contains('hidden')){ document.getElementById('ai-chat-input').focus(); }
}

function handleAIEnter(event) { 
    if (event.key === 'Enter') {
        event.preventDefault(); 
        sendAIMessage(); 
    }
}

function addMessageToUI(text, isBot) {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-msg-bubble ${isBot ? 'ai-msg-bot' : 'ai-msg-user'}`;
    let formattedText = text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    msgDiv.innerHTML = formattedText;
    messagesContainer.appendChild(msgDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showAILoading() {
    const messagesContainer = document.getElementById('ai-chat-messages');
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'ai-msg-bubble ai-msg-bot';
    loaderDiv.id = 'ai-loading-indicator';
    loaderDiv.innerHTML = `<div class="ai-typing-indicator"><div class="ai-dot"></div><div class="ai-dot"></div><div class="ai-dot"></div></div>`;
    messagesContainer.appendChild(loaderDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeAILoading() {
    const loader = document.getElementById('ai-loading-indicator');
    if (loader) loader.remove();
}

function showAIResponse(text) {
    const chatWindow = document.getElementById('ai-chat-window');
    if(chatWindow.classList.contains('hidden')) toggleAIChat();
    addMessageToUI(text, true);
}

async function sendAIMessage() {
    const inputField = document.getElementById('ai-chat-input');
    const text = inputField.value.trim();
    if (!text) return;

    inputField.value = '';
    addMessageToUI(text, false);
    showAILoading();

    const systemPrompt = `
        Ты — ИИ-помощник на платформе "MovieTracker". Твоя задача:
        - Помогать пользователям находить фильмы для просмотра.
        - Рассказывать о жанрах, актерах, режиссерах и сюжетах.
        - Быть дружелюбным, использовать эмодзи 🍿🎬🎥.
        - Давать рекомендации в формате списков с кратким описанием.
        - Отвечать кратко и лаконично (не более 3-4 абзацев).
    `;

    const payload = {
        contents: [{ parts: [{ text: text }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    let attempt = 0;
    const delays = [1000, 2000, 4000, 8000, 16000];

    while (attempt < 6) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

            removeAILoading();
            if (botResponse) { addMessageToUI(botResponse, true); } 
            else { addMessageToUI("Извините, я не смог сформулировать ответ. 😔", true); }
            return; 

        } catch (error) {
            if (attempt < 5) {
                await new Promise(resolve => setTimeout(resolve, delays[attempt]));
                attempt++;
            } else {
                removeAILoading();
                addMessageToUI("К сожалению, произошла ошибка сети при обращении к серверу ИИ. Пожалуйста, попробуйте спросить чуть позже. 🎬", true);
                return;
            }
        }
    }
}