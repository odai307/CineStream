import { useEffect, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import MovieCard from "../components/MovieCard";
import { getPopularMovies, getTrendingMovies } from "../lib/tmdb";

function HomeScreen({ navigation }) {
  const [trending, setTrending] = useState([]);
  const [popular, setPopular] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [trend, pop] = await Promise.all([
          getTrendingMovies(),
          getPopularMovies(),
        ]);
        setTrending(trend.map((item) => ({ ...item, media_type: "movie" })));
        setPopular(pop.map((item) => ({ ...item, media_type: "movie" })));
      } catch (err) {
        setError(err.message || "Failed to load content");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const openWatch = (item) => {
    navigation.navigate("Watch", {
      id: item.id,
      mediaType: item.media_type || "movie",
      title: item.title || item.name,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.secondary}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>CineStream</Text>
      <Text style={styles.heading}>Trending Movies</Text>
      <FlatList
        data={trending}
        horizontal
        keyExtractor={(item) => `trend-${item.id}`}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={() => openWatch(item)} />
        )}
        showsHorizontalScrollIndicator={false}
      />

      <Text style={[styles.heading, styles.sectionSpacing]}>Popular Movies</Text>
      <FlatList
        data={popular}
        horizontal
        keyExtractor={(item) => `pop-${item.id}`}
        renderItem={({ item }) => (
          <MovieCard item={item} onPress={() => openWatch(item)} />
        )}
        showsHorizontalScrollIndicator={false}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 16,
  },
  brand: {
    color: "#dc2626",
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 16,
  },
  heading: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 24,
  },
  centered: {
    flex: 1,
    backgroundColor: "#0a0a0f",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  secondary: {
    color: "#9ca3af",
  },
  error: {
    color: "#f87171",
    textAlign: "center",
  },
});

export default HomeScreen;
