// Configuration centralisee pour corriger les chemins des images
(function (w) {
    function inferProjectBasePath() {
        try {
            const path = (w.location && w.location.pathname) ? w.location.pathname : '/';
            const first = path.split('/').filter(Boolean)[0] || '';
            if (!first || first.includes('.')) return '';
            return '/' + first;
        } catch (e) {
            return '';
        }
    }

    function getAssetsBase() {
        if (w.ASSETS_BASE_URL) {
            return String(w.ASSETS_BASE_URL).replace(/\/+$/, '');
        }
        const projectBase = inferProjectBasePath();
        return projectBase ? (projectBase + '/assets') : '/assets';
    }

    w.IMAGE_CONFIG = {
        defaultImage: 'default.jpg',

        getBasePath: function () {
            return getAssetsBase() + '/images/';
        },

        getDefaultPath: function() {
            return this.getBasePath() + this.defaultImage;
        },

        resolve: function(src) {
            if (!src || src === 'default.jpg') return this.getDefaultPath();

            const value = String(src).trim();
            if (!value) return this.getDefaultPath();

            // Absolute URL/data URL
            if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
                return value;
            }

            // Root absolute
            if (value.startsWith('/')) {
                // Normalize /assets/... when app is served from /Titi or any subfolder
                const assetsBase = getAssetsBase();
                if (value.startsWith('/assets/') && assetsBase !== '/assets') {
                    return assetsBase + value.slice('/assets'.length);
                }
                return value;
            }

            // assets-relative
            if (value.startsWith('assets/')) {
                return getAssetsBase() + value.slice('assets'.length);
            }

            // plain filename or relative path => images dir
            if (!value.includes('/')) {
                return this.getBasePath() + value;
            }

            return value;
        }
    };

    w.resolveAssetUrl = function(src, defaultPath) {
        return w.IMAGE_CONFIG.resolve(src) || defaultPath || (w.DEFAULT_IMAGE || w.IMAGE_CONFIG.getDefaultPath());
    };
})(window);
