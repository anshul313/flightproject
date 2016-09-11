SELECT
  future.user1, future.user2, future.name, future.profile_pic,
  future.past_origin, future.past_destination, future.past_time, future.past_number, future.past_airline,
  first(future.origin) future_origin, first(future.destination) future_destination, first(future.time) future_time, first(future.number) future_number, first(future.airline) future_airline
  FROM
  (SELECT
    past1.*,
    origin, destination, user1_time as time, number, airline
    FROM
    (select
      past.user1, past.user2, past.name, past.profile_pic,
      first(past.origin) past_origin, first(past.destination) past_destination, first(past.time) past_time, first(past.number) past_number, first(past.airline) past_airline
      FROM
      (select
        conn.*,
        origin, destination, user1_time as time, number, airline
        FROM
        (SELECT a.user1,
          a.user2,
          c.name,
          c.profile_pic
          FROM "like" a,
          "like" b,
          "user" c
          WHERE ((a.user1 = b.user2) AND (a.user2 = b.user1) AND (a.is_liked = true) AND (b.is_liked = true) AND (a.user2 = c.id))) conn
        LEFT JOIN
        browseable
        ON
        conn.user1 = browseable.user1 and
        conn.user2 = browseable.user2 and
        browseable.user1_flight = browseable.user2_flight and
        browseable.user1_time <= now()
        ORDER BY time DESC
      ) AS past
      GROUP BY past.user1, past.user2, past.name, past.profile_pic
    ) AS past1
    LEFT JOIN
    browseable
    ON
    past1.user1 = browseable.user1 and
    past1.user2 = browseable.user2 and
    browseable.user1_flight = browseable.user2_flight and
    browseable.user1_time >= now()
    ORDER BY time ASC
  ) AS future
  GROUP BY
    future.user1, future.user2, future.name, future.profile_pic,
    future.past_origin, future.past_destination, future.past_time, future.past_number, future.past_airline;
