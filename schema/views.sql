-- arrivals

CREATE VIEW arrivals AS
 SELECT uf.user_id,
    f.destination AS city,
    uf.flight_id,
    f.arrival AS "time"
   FROM flights f,
    user_flight uf
  WHERE (f.id = uf.flight_id);

-- departures

CREATE VIEW departures AS
 SELECT a.user_id,
    b.origin AS city,
    a.flight_id,
    a.departure AS "time"
   FROM flight b,
    user_flight a
  WHERE (b.id = a.flight_id);

-- arrival_cum_departure

CREATE VIEW arrival_cum_departure AS
 SELECT arrivals.user_id,
    arrivals.city,
    arrivals.flight_id,
    arrivals."time"
   FROM arrivals
UNION
 SELECT departures.user_id,
    departures.city,
    departures.flight_id,
    departures."time"
   FROM departures;


-- browseable

CREATE VIEW browseable AS
 SELECT c.user1,
    c.user2,
    c.city,
    c.user1_flight,
    flight1.origin,
    flight1.destination,
    flight1.number,
    flight1.airline,
    c.user2_flight,
    c.user1_time,
    c.user2_time,
    l12.is_liked AS liked_12,
    l21.is_liked AS liked_21,
        CASE
            WHEN (l12."timestamp" IS NULL) THEN l21."timestamp"
            WHEN (l21."timestamp" IS NULL) THEN l12."timestamp"
            WHEN (l12."timestamp" > l21."timestamp") THEN l12."timestamp"
            ELSE l21."timestamp"
        END AS like_timestamp,
    user2.name AS user2_name,
    user2.facebook_id AS user2_facebook_id,
    user2.city AS user2_city,
    user2.profile_pic AS user2_profile_pic,
    user2.intent AS user2_intent,
    edu2.education AS user2_education,
    exp2.experience AS user2_experience,
    int2.interest AS user2_interest,
    (c.user1_flight = c.user2_flight) AS is_same_flight
   FROM (((((((( SELECT a.user_id AS user1,
            b.user_id AS user2,
            a.city,
            a.flight_id AS user1_flight,
            b.flight_id AS user2_flight,
            a."time" AS user1_time,
            b."time" AS user2_time
           FROM arrival_cum_departure a,
            arrival_cum_departure b
          WHERE ((a.user_id <> b.user_id) AND (a.city = b.city) AND ((a."time" - b."time") > '-02:00:00'::interval) AND ((a."time" - b."time") < '02:00:00'::interval))) c
     LEFT JOIN "like" l12 ON (((c.user1 = l12.user1) AND (c.user2 = l12.user2))))
     LEFT JOIN "like" l21 ON (((c.user1 = l21.user2) AND (c.user2 = l21.user1))))
     LEFT JOIN "user" user2 ON ((c.user2 = user2.id)))
     LEFT JOIN ( SELECT user_education.user_id,
            json_agg(ROW(user_education.institute_name, user_education.qualification)) AS education
           FROM user_education
          GROUP BY user_education.user_id) edu2 ON ((edu2.user_id = c.user2)))
     LEFT JOIN ( SELECT user_experience.user_id,
            json_agg(ROW(user_experience.company_name, user_experience.designation)) AS experience
           FROM user_experience
          GROUP BY user_experience.user_id) exp2 ON ((exp2.user_id = c.user2)))
     LEFT JOIN ( SELECT user_interest.user_id,
            json_agg(user_interest.interest) AS interest
           FROM user_interest
          GROUP BY user_interest.user_id) int2 ON ((int2.user_id = c.user2)))
     LEFT JOIN flights flight1 ON ((c.user1_flight = flight1.id)));


-- connections

CREATE VIEW connections AS
 SELECT future.user1,
    future.user2,
    future.name,
    future.profile_pic,
    future.past_origin,
    future.past_destination,
    future.past_time,
    future.past_number,
    future.past_airline,
    first(future.origin) AS future_origin,
    first(future.destination) AS future_destination,
    first(future."time") AS future_time,
    first(future.number) AS future_number,
    first(future.airline) AS future_airline
   FROM ( SELECT past1.user1,
            past1.user2,
            past1.name,
            past1.profile_pic,
            past1.past_origin,
            past1.past_destination,
            past1.past_time,
            past1.past_number,
            past1.past_airline,
            browseable.origin,
            browseable.destination,
            browseable.user1_time AS "time",
            browseable.number,
            browseable.airline
           FROM (( SELECT past.user1,
                    past.user2,
                    past.name,
                    past.profile_pic,
                    first(past.origin) AS past_origin,
                    first(past.destination) AS past_destination,
                    first(past."time") AS past_time,
                    first(past.number) AS past_number,
                    first(past.airline) AS past_airline
                   FROM ( SELECT conn.user1,
                            conn.user2,
                            conn.name,
                            conn.profile_pic,
                            browseable_1.origin,
                            browseable_1.destination,
                            browseable_1.user1_time AS "time",
                            browseable_1.number,
                            browseable_1.airline
                           FROM (( SELECT a.user1,
                                    a.user2,
                                    c.name,
                                    c.profile_pic
                                   FROM "like" a,
                                    "like" b,
                                    "user" c
                                  WHERE ((a.user1 = b.user2) AND (a.user2 = b.user1) AND (a.is_liked = true) AND (b.is_liked = true) AND (a.user2 = c.id))) conn
                             LEFT JOIN browseable browseable_1 ON (((conn.user1 = browseable_1.user1) AND (conn.user2 = browseable_1.user2) AND (browseable_1.user1_flight = browseable_1.user2_flight) AND (browseable_1.user1_time <= now()))))
                          ORDER BY browseable_1.user1_time DESC) past
                  GROUP BY past.user1, past.user2, past.name, past.profile_pic) past1
             LEFT JOIN browseable ON (((past1.user1 = browseable.user1) AND (past1.user2 = browseable.user2) AND (browseable.user1_flight = browseable.user2_flight) AND (browseable.user1_time >= now()))))
          ORDER BY browseable.user1_time) future
  GROUP BY future.user1, future.user2, future.name, future.profile_pic, future.past_origin, future.past_destination, future.past_time, future.past_number, future.past_airline;


