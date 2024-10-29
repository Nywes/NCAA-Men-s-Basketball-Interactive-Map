import React, { useState, useEffect } from 'react';
import adjustBrightness from './colorDetection';

const TeamStanding = ({ team }) => {
  const [conferenceData, setConferenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fonction pour récupérer les standings d'une conférence spécifique
  const fetchStandingsByConferenceId = async (conferenceId) => {
    try {
      const response = await fetch(
        'https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings'
      );
      const data = await response.json();

      // Vérifie si la donnée de standings existe
      if (!data || !data.children) {
        console.error('Data format is unexpected or missing');
        setError('Unexpected data format');
        return;
      }

      // Filtrer les données pour obtenir uniquement celles de la conférence souhaitée
      const conferenceData = data.children.find((conference) => conference.id === conferenceId);

      if (conferenceData) {
        setConferenceData(conferenceData); // Met à jour l'état avec les données de la conférence
      } else {
        setError('Aucune conférence trouvée avec cet ID');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      setError('Erreur lors de la récupération des données');
    } finally {
      setLoading(false); // Arrêter le chargement
    }
  };

  useEffect(() => {
    const conferenceId = team.groups.id;
    fetchStandingsByConferenceId(conferenceId);
  }, [team.groups.id]);

  //TODO, au lieu de ce texte faire en sorte que la border du boutton tourne, comme une course de nascar pour avoir l'illusion du chargement
  if (loading) {
    return <div style={{ marginTop: '8px', gap: '8px', display: 'flex', flexDirection: 'column' }}>Chargement des données de la conférence...</div>;
  }

  if (error) {
    return <div style={{ marginTop: '8px', gap: '8px', display: 'flex', flexDirection: 'column' }}>{error}</div>;
  }

  // Extraire les entrées de classement
  const entries = conferenceData.standings.entries;

  // Fonction pour obtenir le bilan de la conférence et le bilan global
  const getStats = (entry) => {
    const conferenceStats = entry.stats.find((stat) => stat.name === 'vs. Conf.');
    const overallStats = entry.stats.find((stat) => stat.name === 'overall');
    return {
      conferenceRecord: conferenceStats ? conferenceStats.displayValue : 'N/A',
      overallRecord: overallStats ? overallStats.displayValue : 'N/A',
    };
  };

  // Trier les entrées d'abord par bilan de conférence, puis par bilan global
  const getRecordNumbers = (record) => {
    const [wins, losses] = record.split('-').map(Number);
    return { wins, losses };
  };

  const sortedEntries = entries.sort((a, b) => {
    const { conferenceRecord: recordA, overallRecord: overallA } = getStats(a);
    const { conferenceRecord: recordB, overallRecord: overallB } = getStats(b);

    // Convertir les bilans en nombres
    const { wins: confWinsA, losses: confLossesA } = getRecordNumbers(recordA);
    const { wins: confWinsB, losses: confLossesB } = getRecordNumbers(recordB);

    // Comparer les bilans de conférence
    if (confWinsA !== confWinsB) {
      return confWinsB - confWinsA; // Tri par victoires
    } else if (confLossesA !== confLossesB) {
      return confLossesA - confLossesB; // Tri par défaites
    }

    // Convertir les bilans globaux en nombres
    const { wins: overallWinsA, losses: overallLossesA } = getRecordNumbers(overallA);
    const { wins: overallWinsB, losses: overallLossesB } = getRecordNumbers(overallB);

    // Si les bilans de conférence sont égaux, comparer les bilans globaux
    if (overallWinsA !== overallWinsB) {
      return overallWinsB - overallWinsA; // Tri par victoires globales
    } else {
      return overallLossesA - overallLossesB; // Tri par défaites globales
    }
  });

  // Affichage des données de la conférence
  return (
    <div style={{ marginTop: '8px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
      <h2>
        {conferenceData.name} - {conferenceData.standings.seasonDisplayName}
      </h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          boxSizing: 'border-box',
          borderSpacing: '0',
        }}
      >
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Équipe</th>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Conference</th>
            <th style={{ border: '1px solid #ccc', padding: '4px' }}>Overall</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry, index) => {
            const { conferenceRecord, overallRecord } = getStats(entry);
            const isCurrentTeamChecked = team.id === entry.team.id;
            return (
              <tr
                key={index}
                style={{
                  backgroundColor: isCurrentTeamChecked
                    ? adjustBrightness(team.color, 80)
                    : 'inherit',
                }}
              >
                <td
                  style={{
                    padding: '4px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    border: '1px solid #ccc',
                  }}
                >
                  <img
                    src={`https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500/${entry.team.id}.png&h=40&w=40`}
                    alt="logo"
                    style={{ width: '20px', height: '20px' }}
                  />
                  {entry.team.displayName}
                </td>
                <td style={{ padding: '4px', border: '1px solid #ccc' }}>{conferenceRecord}</td>
                <td style={{ padding: '4px', border: '1px solid #ccc' }}>{overallRecord}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TeamStanding;
