import pg from 'pg';

const { Pool } = pg;

class PlaylistService {
    constructor() {
        this._pool = new Pool({
            host: process.env.PGHOST,
            port: process.env.PGPORT,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
            database: process.env.PGDATABASE,
        });
    }

    async getPlaylistById(playlistId) {
        const playlistQuery = {
            text: 'SELECT id, name FROM playlists WHERE id = $1',
            values: [playlistId],
        };

        const playlistResult = await this._pool.query(playlistQuery);

        if (!playlistResult.rows.length) {
            throw new Error('Playlist tidak ditemukan');
        }

        const playlist = playlistResult.rows[0];

        // Get songs in the playlist
        const songsQuery = {
            text: `SELECT s.id, s.title, s.performer 
                   FROM songs s
                   INNER JOIN playlist_songs ps ON s.id = ps.song_id
                   WHERE ps.playlist_id = $1`,
            values: [playlistId],
        };

        const songsResult = await this._pool.query(songsQuery);

        return {
            playlist: {
                id: playlist.id,
                name: playlist.name,
                songs: songsResult.rows,
            },
        };
    }
}

export default PlaylistService;
